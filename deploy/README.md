# Deploy — Hetzner VPS + Angie

CI/CD lives in `.github/workflows/deploy.yml`. On every push to `main`
(including Sveltia CMS commits) it:

1. Checks out the repo **with the `qu.theme` submodule**.
2. Builds the site with Hugo extended (`--environment production`).
3. Runs Pagefind against `public/`.
4. rsyncs the output to `/var/www/qa.qu.edu.iq/releases/<timestamp>-<sha>/`.
5. Atomically swaps the `current` symlink to the new release.
6. Prunes all but the 5 most recent releases.

Angie serves `/var/www/qa.qu.edu.iq/current/` over HTTP/3, with the TLS
certificate issued and auto-renewed by Angie's native ACME module — no
certbot, no cron.

## 1. GitHub repository secrets

In `Settings → Secrets and variables → Actions → New repository secret`:

| Secret | Value |
| ------ | ----- |
| `SSH_HOST` | Hetzner VPS hostname or IP (e.g. `qa.qu.edu.iq` or `49.12.34.56`). |
| `SSH_USER` | Deploy user on the VPS (e.g. `deploy`). **Not root.** |
| `SSH_PORT` | *(Optional)* SSH port — omit if 22. |
| `SSH_PRIVATE_KEY` | Private half of an SSH keypair generated **only for this workflow**. Full PEM, including header/footer. |
| `SSH_KNOWN_HOSTS` | Output of `ssh-keyscan -t ed25519,rsa -p <port> <host>` — pins the server's host key so a hijacked DNS can't get a working SSH session. |

### Generating the deploy keypair

On your laptop (not on the VPS):

```bash
ssh-keygen -t ed25519 -C "gha-deploy@qa.qu.edu.iq" -f ./gha_deploy -N ""

# Public half → install on VPS
ssh-copy-id -i ./gha_deploy.pub deploy@<host>

# Private half → paste into the SSH_PRIVATE_KEY secret
cat ./gha_deploy

# Host-key fingerprints → paste into the SSH_KNOWN_HOSTS secret
ssh-keyscan -t ed25519,rsa <host>
```

Restrict the public key on the VPS so it can only run the deploy
operations (optional but recommended). In
`~deploy/.ssh/authorized_keys`:

```
from="<github-actions-egress>",no-port-forwarding,no-X11-forwarding,no-agent-forwarding ssh-ed25519 AAAA... gha-deploy@qa.qu.edu.iq
```

(`from=` is optional — GitHub's egress IP ranges are large and change.
Skip it unless you mirror GitHub's `meta` endpoint.)

## 2. VPS preparation

Once per VPS. Run as a user with sudo.

```bash
# 2.1 Create the deploy user and webroot.
sudo useradd --create-home --shell /bin/bash deploy
sudo mkdir -p /var/www/qa.qu.edu.iq/releases
sudo chown -R deploy:angie /var/www/qa.qu.edu.iq
sudo chmod -R g+rX           /var/www/qa.qu.edu.iq

# 2.2 Install Angie >= 1.6 (the ACME module ships with 1.6+).
#     Follow https://angie.software/en/install/ for your distro — the
#     binary package, not the source build, picks up the acme module.

# 2.3 Drop in the configs.
sudo install -m 644 deploy/angie/acme.conf            /etc/angie/http.d/acme.conf
sudo install -m 644 deploy/angie/qa.qu.edu.iq.conf    /etc/angie/http.d/qa.qu.edu.iq.conf

# 2.4 Make sure Angie's ACME state directory exists and is writable.
sudo mkdir -p /var/lib/angie/acme
sudo chown -R angie:angie /var/lib/angie/acme

# 2.5 Open ports.
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 443/udp        # HTTP/3 / QUIC

# 2.6 Validate + reload.
sudo angie -t
sudo systemctl reload angie
```

The first reload after step 2.6 triggers issuance. Angie writes the
cert under `/var/lib/angie/acme/letsencrypt/` and renews it
automatically `renew_before_expiry=30d` ahead of expiry — declared in
`deploy/angie/acme.conf`. There is no cron job, no certbot, no
systemd timer to manage.

Tail `journalctl -u angie -f` during the first reload to watch the
issuance flow. If it fails, the most common causes are:

- DNS for `qa.qu.edu.iq` not yet pointing at the VPS (Let's Encrypt
  can't reach the http-01 challenge).
- Port 80 blocked by a firewall or another process.
- Angie running an older build without the ACME module (`angie -V 2>&1
  | grep -i acme` should mention it).

## 3. First deploy

Push to `main`. Watch the Actions tab. On success:

```bash
ssh deploy@<host> ls -la /var/www/qa.qu.edu.iq/
# current -> releases/20260523-141500-abcd1234
# releases/
```

If something looks off, the previous release is still on disk — point
the symlink back and you're rolled back:

```bash
ssh deploy@<host>
cd /var/www/qa.qu.edu.iq
ls -1dt releases/*/        # pick the one before "current" points at
ln -sfn releases/<previous>/ current.new && mv -Tf current.new current
```

No Angie reload needed — the symlink swap is what `try_files` resolves
against on the next request.

## 4. Bumping Hugo

The Hugo version is pinned at the top of `.github/workflows/deploy.yml`:

```yaml
env:
  HUGO_VERSION: '0.144.2'
```

Bump it in a PR; the workflow installs the matching `.deb`. Keep it on
**extended** — the theme uses Hugo Pipes / SCSS.
