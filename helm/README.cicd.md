# CI/CD Deployment Options for the VPS Helm Chart

This guide explains how to deploy the `/helm` umbrella chart automatically when new code is pushed.

The recommended setup for this repo is:

1. GitHub Actions builds and pushes Docker images for all services.
2. Every image is tagged with the fixed version tag plus architecture suffix.
3. GitHub Actions connects to the VPS by SSH.
4. The VPS checks out the same commit and runs `helm upgrade --install` with image overrides.

This keeps the VPS deployment on an exact architecture tag instead of a mutable `latest` image or a random build tag.

## Option Summary

| Option | Best for | Tradeoff |
| --- | --- | --- |
| GitHub Actions + SSH to VPS | Current VPS setup where Helm usually runs on the server | Simple and does not expose Kubernetes kubeconfig to GitHub |
| GitHub Actions + kubeconfig secret | Kubernetes API is reachable from GitHub-hosted runners | Faster deploy path, but kubeconfig becomes a CI secret |
| GitOps with Argo CD or Flux | Long-term production-style deployment | More setup, but the cluster continuously reconciles the desired chart state |

For this repo, start with **GitHub Actions + SSH to VPS**. Move to GitOps later if you want automatic drift correction, approvals, or separate environment promotion.

## Image Tag Strategy

Avoid relying on `latest` for Kubernetes deployments. This repo uses fixed version `2` and exact architecture tags:

- GitHub Actions builds `linux/amd64` and publishes `:2-amd64`.
- Local multi-platform builds publish `:2`, `:2-amd64`, and `:2-arm64`.
- VPS Helm values use `:2-amd64`.
- Local Docker Compose and raw K8s manifests use `:2-arm64`.

```text
docker.io/<docker-user>/api-gateway:2-amd64
docker.io/<docker-user>/product-service:2-amd64
docker.io/<docker-user>/landing-fe:2-amd64
docker.io/<docker-user>/admin-fe:2-amd64
```

The existing `scripts/docker-build-v2.sh` script already builds and pushes every backend and frontend image. The CI pipeline only needs to set:

```bash
IMAGE_TAG=2
PLATFORMS=linux/amd64
CREATE_MANIFEST=false
DOCKER_USERNAME=<docker-user>
DOCKER_PASSWORD=<docker-password-or-token>
```

For a local build/push that creates `:2`, `:2-amd64`, and `:2-arm64`, use the default tag and both platforms:

```bash
IMAGE_TAG=2 \
PLATFORMS=linux/amd64,linux/arm64 \
DOCKER_USERNAME=<docker-user> \
DOCKER_PASSWORD=<docker-password-or-token> \
./scripts/docker-build-v2.sh
```

To build only the service or frontend you changed, pass the module lists:

```bash
IMAGE_TAG=2 \
PLATFORMS=linux/amd64 \
BACKEND_MODULES="product-service" \
FRONTEND_APPS=" " \
DOCKER_USERNAME=<docker-user> \
DOCKER_PASSWORD=<docker-password-or-token> \
./scripts/docker-build-v2.sh
```

The chart images are overridden at deploy time with these Helm values:

```text
applications.apiGateway.image
applications.productService.image
applications.orderService.image
applications.inventoryService.image
applications.notificationService.image
applications.paymentService.image
applications.shopService.image
applications.customerService.image
applications.landingFe.image
applications.adminFe.image
applications.shopFe.image
applications.customerFeNext.image
applications.customerFeAngular.image
```

## One-Time VPS Preparation

Run this once before enabling the pipeline.

1. Make sure the VPS deployment from `README.vps.md` works manually.

   ```bash
   ssh root@103.6.234.153
   cd /root/spring-boot
   helm dependency build helm
   helm upgrade --install microservices helm \
     --namespace microservices \
     --create-namespace
   ```

2. Keep `/root/spring-boot` as a clean deployment checkout.

   The CI workflow checks out the exact Git commit being deployed. Do not keep manual edits in this checkout.

3. Install Gateway API CRDs and NGINX Gateway Fabric once.

   These are cluster-level dependencies and should not be reinstalled on every app deploy. Use the commands from `README.vps.md`.

4. Create an SSH key for CI.

   On your local machine:

   ```bash
   ssh-keygen -t ed25519 -C "github-actions-vps-deploy" -f ./github-actions-vps-deploy
   ```

   Add the public key to the VPS:

   ```bash
   ssh-copy-id -i ./github-actions-vps-deploy.pub root@103.6.234.153
   ```

   If `ssh-copy-id` is not installed:

   ```bash
   cat ./github-actions-vps-deploy.pub | ssh root@103.6.234.153 'mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys'
   ```

   The private key content from `./github-actions-vps-deploy` goes into the GitHub secret `VPS_SSH_KEY`.

## GitHub Secrets

Create these secrets in GitHub:

| Secret | Example | Purpose |
| --- | --- | --- |
| `DOCKER_USERNAME` | `hai2k2tt` | Docker Hub username |
| `DOCKER_PASSWORD` | Docker Hub access token | Push image tags |
| `VPS_HOST` | `103.6.234.153` | VPS IP or DNS name |
| `VPS_USER` | `root` | SSH user |
| `VPS_SSH_KEY` | private key text | SSH deploy key |
| `VPS_SSH_PORT` | `22` | Optional SSH port |

Prefer a Docker Hub access token over your account password.

## Recommended GitHub Actions Workflow

Create this file:

```text
.github/workflows/deploy-vps.yml
```

```yaml
name: Build and deploy to VPS

on:
  push:
    branches:
      - master
  workflow_dispatch:

concurrency:
  group: deploy-vps
  cancel-in-progress: true

permissions:
  contents: read

env:
  FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true
  VPS_REPO_DIR: /root/spring-boot
  IMAGE_TAG: "2"
  DEPLOY_IMAGE_TAG: "2-amd64"
  PLATFORMS: linux/amd64
  CREATE_MANIFEST: "false"

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    environment: docker

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Java
        uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: "21"
          cache: maven

      - name: Set up QEMU
        uses: docker/setup-qemu-action@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build and push images
        env:
          DOCKER_USERNAME: ${{ secrets.DOCKER_USERNAME }}
          DOCKER_PASSWORD: ${{ secrets.DOCKER_PASSWORD }}
        run: |
          chmod +x scripts/docker-build-v2.sh
          ./scripts/docker-build-v2.sh

      - name: Configure SSH
        env:
          VPS_HOST: ${{ secrets.VPS_HOST }}
          VPS_SSH_KEY: ${{ secrets.VPS_SSH_KEY }}
          VPS_PORT: ${{ secrets.VPS_SSH_PORT }}
        run: |
          set -euo pipefail
          VPS_PORT="${VPS_PORT:-22}"
          install -m 700 -d ~/.ssh
          printf '%s\n' "$VPS_SSH_KEY" > ~/.ssh/vps_key
          chmod 600 ~/.ssh/vps_key
          ssh-keyscan -p "$VPS_PORT" "$VPS_HOST" >> ~/.ssh/known_hosts

      - name: Deploy Helm chart on VPS
        env:
          DOCKER_USERNAME: ${{ secrets.DOCKER_USERNAME }}
          VPS_HOST: ${{ secrets.VPS_HOST }}
          VPS_USER: ${{ secrets.VPS_USER }}
          VPS_PORT: ${{ secrets.VPS_SSH_PORT }}
        run: |
          set -euo pipefail
          VPS_PORT="${VPS_PORT:-22}"

          ssh -i ~/.ssh/vps_key -p "$VPS_PORT" "$VPS_USER@$VPS_HOST" \
            "DEPLOY_IMAGE_TAG='$DEPLOY_IMAGE_TAG' DOCKER_USERNAME='$DOCKER_USERNAME' DEPLOY_SHA='$GITHUB_SHA' DEPLOY_REF='$GITHUB_REF_NAME' REPO_DIR='$VPS_REPO_DIR' bash -s" <<'REMOTE'
          set -euo pipefail

          cd "$REPO_DIR"
          git fetch --depth=1 origin "$DEPLOY_REF"
          git checkout --detach "$DEPLOY_SHA"

          IMAGE_PREFIX="docker.io/${DOCKER_USERNAME}"

          helm dependency build helm
          helm upgrade --install microservices helm \
            --namespace microservices \
            --create-namespace \
            --set-string applications.apiGateway.image="${IMAGE_PREFIX}/api-gateway:${DEPLOY_IMAGE_TAG}" \
            --set-string applications.productService.image="${IMAGE_PREFIX}/product-service:${DEPLOY_IMAGE_TAG}" \
            --set-string applications.orderService.image="${IMAGE_PREFIX}/order-service:${DEPLOY_IMAGE_TAG}" \
            --set-string applications.inventoryService.image="${IMAGE_PREFIX}/inventory-service:${DEPLOY_IMAGE_TAG}" \
            --set-string applications.notificationService.image="${IMAGE_PREFIX}/notification-service:${DEPLOY_IMAGE_TAG}" \
            --set-string applications.paymentService.image="${IMAGE_PREFIX}/payment-service:${DEPLOY_IMAGE_TAG}" \
            --set-string applications.shopService.image="${IMAGE_PREFIX}/shop-service:${DEPLOY_IMAGE_TAG}" \
            --set-string applications.customerService.image="${IMAGE_PREFIX}/customer-service:${DEPLOY_IMAGE_TAG}" \
            --set-string applications.landingFe.image="${IMAGE_PREFIX}/landing-fe:${DEPLOY_IMAGE_TAG}" \
            --set-string applications.adminFe.image="${IMAGE_PREFIX}/admin-fe:${DEPLOY_IMAGE_TAG}" \
            --set-string applications.shopFe.image="${IMAGE_PREFIX}/shop-fe:${DEPLOY_IMAGE_TAG}" \
            --set-string applications.customerFeNext.image="${IMAGE_PREFIX}/customer-fe-next:${DEPLOY_IMAGE_TAG}" \
            --set-string applications.customerFeAngular.image="${IMAGE_PREFIX}/customer-fe-angular:${DEPLOY_IMAGE_TAG}" \
            --set-string applications.apiGateway.imagePullPolicy=Always \
            --set-string applications.productService.imagePullPolicy=Always \
            --set-string applications.orderService.imagePullPolicy=Always \
            --set-string applications.inventoryService.imagePullPolicy=Always \
            --set-string applications.notificationService.imagePullPolicy=Always \
            --set-string applications.paymentService.imagePullPolicy=Always \
            --set-string applications.shopService.imagePullPolicy=Always \
            --set-string applications.customerService.imagePullPolicy=Always \
            --set-string applications.landingFe.imagePullPolicy=Always \
            --set-string applications.adminFe.imagePullPolicy=Always \
            --set-string applications.shopFe.imagePullPolicy=Always \
            --set-string applications.customerFeNext.imagePullPolicy=Always \
            --set-string applications.customerFeAngular.imagePullPolicy=Always

          for deploy in \
            api-gateway \
            product-service \
            order-service \
            inventory-service \
            notification-service \
            payment-service \
            shop-service \
            customer-service \
            landing-fe \
            admin-fe \
            shop-fe \
            customer-fe-next \
            customer-fe-angular
          do
            kubectl rollout restart "deployment/${deploy}" \
              --namespace microservices
          done

          for deploy in \
            api-gateway \
            product-service \
            order-service \
            inventory-service \
            notification-service \
            payment-service \
            shop-service \
            customer-service \
            landing-fe \
            admin-fe \
            shop-fe \
            customer-fe-next \
            customer-fe-angular
          do
            kubectl rollout status "deployment/${deploy}" \
              --namespace microservices \
              --timeout=300s
          done
          REMOTE
```

## Faster VPS-Only Variant

The checked-in workflow already builds only `linux/amd64` for the VPS:

```yaml
env:
  PLATFORMS: linux/amd64
  CREATE_MANIFEST: "false"
```

Use the local build command above when you need both `:2-amd64` and `:2-arm64` for Docker Compose or a local Kubernetes cluster.

## Alternative: Deploy Directly with kubeconfig

Use this option only if the VPS Kubernetes API is reachable from GitHub Actions.

Add a GitHub secret:

```text
KUBECONFIG_B64
```

Create it from a working kubeconfig:

```bash
# Linux
base64 -w0 ~/.kube/config

# macOS
base64 -i ~/.kube/config | tr -d '\n'
```

Then replace the SSH deploy step with:

```yaml
- name: Configure kubeconfig
  env:
    KUBECONFIG_B64: ${{ secrets.KUBECONFIG_B64 }}
  run: |
    set -euo pipefail
    install -m 700 -d ~/.kube
    printf '%s' "$KUBECONFIG_B64" | base64 -d > ~/.kube/config
    chmod 600 ~/.kube/config

- name: Deploy Helm chart
  env:
    DOCKER_USERNAME: ${{ secrets.DOCKER_USERNAME }}
    DEPLOY_IMAGE_TAG: "2-amd64"
  run: |
    set -euo pipefail
    IMAGE_PREFIX="docker.io/${DOCKER_USERNAME}"
    helm dependency build helm
    helm upgrade --install microservices helm \
      --namespace microservices \
      --create-namespace \
      --set-string applications.apiGateway.image="${IMAGE_PREFIX}/api-gateway:${DEPLOY_IMAGE_TAG}" \
      --set-string applications.productService.image="${IMAGE_PREFIX}/product-service:${DEPLOY_IMAGE_TAG}" \
      --set-string applications.orderService.image="${IMAGE_PREFIX}/order-service:${DEPLOY_IMAGE_TAG}" \
      --set-string applications.inventoryService.image="${IMAGE_PREFIX}/inventory-service:${DEPLOY_IMAGE_TAG}" \
      --set-string applications.notificationService.image="${IMAGE_PREFIX}/notification-service:${DEPLOY_IMAGE_TAG}" \
      --set-string applications.paymentService.image="${IMAGE_PREFIX}/payment-service:${DEPLOY_IMAGE_TAG}" \
      --set-string applications.shopService.image="${IMAGE_PREFIX}/shop-service:${DEPLOY_IMAGE_TAG}" \
      --set-string applications.customerService.image="${IMAGE_PREFIX}/customer-service:${DEPLOY_IMAGE_TAG}" \
      --set-string applications.landingFe.image="${IMAGE_PREFIX}/landing-fe:${DEPLOY_IMAGE_TAG}" \
      --set-string applications.adminFe.image="${IMAGE_PREFIX}/admin-fe:${DEPLOY_IMAGE_TAG}" \
      --set-string applications.shopFe.image="${IMAGE_PREFIX}/shop-fe:${DEPLOY_IMAGE_TAG}" \
      --set-string applications.customerFeNext.image="${IMAGE_PREFIX}/customer-fe-next:${DEPLOY_IMAGE_TAG}" \
      --set-string applications.customerFeAngular.image="${IMAGE_PREFIX}/customer-fe-angular:${DEPLOY_IMAGE_TAG}"

    kubectl rollout restart deployment/api-gateway deployment/product-service deployment/order-service \
      deployment/inventory-service deployment/notification-service deployment/payment-service \
      deployment/shop-service deployment/customer-service deployment/landing-fe deployment/admin-fe \
      deployment/shop-fe deployment/customer-fe-next deployment/customer-fe-angular \
      --namespace microservices
```

## Alternative: GitOps with Argo CD or Flux

For a more production-like model:

1. Install Argo CD or Flux in the VPS cluster.
2. Point it to this repo and the `helm` chart path.
3. Let CI only build and push images.
4. Update a small values file with the new image tag, or use an image updater controller.
5. Let the GitOps controller sync the chart into the cluster.

The benefit is that the cluster becomes self-reconciling. If someone changes a Deployment manually, the GitOps controller can return it to the Git state.

The tradeoff is extra setup and more moving parts.

## Verify a Deployment

After CI runs, check:

```bash
kubectl get pods -n microservices
helm history microservices -n microservices
helm get values microservices -n microservices
```

Confirm the images:

```bash
kubectl describe deploy \
  api-gateway \
  product-service \
  order-service \
  inventory-service \
  notification-service \
  payment-service \
  shop-service \
  customer-service \
  landing-fe \
  admin-fe \
  shop-fe \
  customer-fe-next \
  customer-fe-angular \
  -n microservices | grep -E "^(Name:|    Image:)"
```

## Rollback

Show release history:

```bash
helm history microservices -n microservices
```

Rollback to a previous revision:

```bash
helm rollback microservices <revision> -n microservices
```

Because the workflow deploys immutable commit image tags, a Helm rollback also restores the previous image references.

## Common Problems

### Pods still run old code

Check the deployed image tag:

```bash
kubectl get deploy api-gateway -n microservices -o jsonpath='{.spec.template.spec.containers[0].image}{"\n"}'
```

If the tag did not change, the Helm override did not run or used the wrong value key.

### Image pull fails

Check:

```bash
kubectl describe pod <pod-name> -n microservices
```

Common causes:

- Wrong Docker username.
- Image was not pushed.
- The tag was built only for the wrong CPU architecture.
- Docker Hub rate limits or private repository credentials.

### Helm deploy fails because the VPS checkout is dirty

Keep `/root/spring-boot` as a deployment-only checkout. Manual source edits should happen locally and be pushed to Git.

### GitHub Actions cannot SSH to the VPS

Check:

- `VPS_HOST`
- `VPS_USER`
- `VPS_SSH_PORT`
- firewall allows SSH from the internet
- public key is in `~/.ssh/authorized_keys` for the deploy user
