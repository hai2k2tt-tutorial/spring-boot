#!/usr/bin/env sh
set -eu

DOCKER_USERNAME="${DOCKER_USERNAME:-hai2k2tt}"
DOCKER_PASSWORD="${DOCKER_PASSWORD:-}"
IMAGE_TAG="${IMAGE_TAG:-2}"
PLATFORMS="${PLATFORMS:-linux/amd64,linux/arm64}"
BUILDER_NAME="${BUILDER_NAME:-multiarch}"
BACKEND_BUILDER_IMAGE="${BACKEND_BUILDER_IMAGE:-paketobuildpacks/ubuntu-noble-builder:latest}"

BACKEND_MODULES="
api-gateway
product-service
inventory-service
order-service
notification-service
payment-service
shop-service
customer-service
"

FRONTEND_APPS="
admin-fe
shop-fe
customer-fe-next
customer-fe-angular
"

if [ -z "$DOCKER_PASSWORD" ]; then
  echo "DOCKER_PASSWORD is required for image publishing."
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required."
  exit 1
fi

if ! command -v mvn >/dev/null 2>&1; then
  echo "mvn is required."
  exit 1
fi

printf '%s' "$DOCKER_PASSWORD" | docker login -u "$DOCKER_USERNAME" --password-stdin

if docker buildx inspect "$BUILDER_NAME" >/dev/null 2>&1; then
  docker buildx use "$BUILDER_NAME"
else
  docker buildx create --name "$BUILDER_NAME" --driver docker-container --use
fi

docker buildx inspect --bootstrap >/dev/null

platforms_space=$(printf '%s' "$PLATFORMS" | tr ',' ' ')

for module in $BACKEND_MODULES; do
  image_base="docker.io/$DOCKER_USERNAME/$module"
  image_sources=""

  for platform in $platforms_space; do
    arch=$(printf '%s' "$platform" | cut -d/ -f2)
    variant=$(printf '%s' "$platform" | cut -s -d/ -f3)
    suffix="$arch"
    if [ -n "$variant" ]; then
      suffix="$suffix-$variant"
    fi

    image_tag="$IMAGE_TAG-$suffix"
    image_ref="$image_base:$image_tag"

    mvn -Pdocker-build \
      -DskipTests \
      -Ddocker.username="$DOCKER_USERNAME" \
      -Ddocker.password="$DOCKER_PASSWORD" \
      -Ddocker.image.tag="$image_tag" \
      -Ddocker.builder.image="$BACKEND_BUILDER_IMAGE" \
      -Dspring-boot.build-image.imagePlatform="$platform" \
      -pl "$module" \
      spring-boot:build-image

    if [ -z "$image_sources" ]; then
      image_sources="$image_ref"
    else
      image_sources="$image_sources $image_ref"
    fi
  done

  # shellcheck disable=SC2086
  docker buildx imagetools create \
    --tag "$image_base:$IMAGE_TAG" \
    $image_sources
done

for app in $FRONTEND_APPS; do
  docker buildx build \
    --platform "$PLATFORMS" \
    --tag "docker.io/$DOCKER_USERNAME/$app:$IMAGE_TAG" \
    --push \
    "$app"
done
