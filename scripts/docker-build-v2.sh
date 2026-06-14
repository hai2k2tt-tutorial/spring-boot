#!/usr/bin/env sh
set -eu

DOCKER_USERNAME="${DOCKER_USERNAME:-hai2k2tt}"
DOCKER_PASSWORD="${DOCKER_PASSWORD:-}"
IMAGE_TAG="${IMAGE_TAG:-2}"
PLATFORMS="${PLATFORMS:-linux/amd64,linux/arm64}"
BUILDER_NAME="${BUILDER_NAME:-multiarch}"
BUILD_RETRIES="${BUILD_RETRIES:-3}"
BUILD_TIMEOUT_SECONDS="${BUILD_TIMEOUT_SECONDS:-3600}"
RETRY_DELAY_SECONDS="${RETRY_DELAY_SECONDS:-15}"
REGISTRY_VERIFY_RETRIES="${REGISTRY_VERIFY_RETRIES:-6}"
REGISTRY_VERIFY_DELAY_SECONDS="${REGISTRY_VERIFY_DELAY_SECONDS:-10}"
DOCKER_BUILD_PROGRESS="${DOCKER_BUILD_PROGRESS:-plain}"
RESUME_PUBLISHED_IMAGES="${RESUME_PUBLISHED_IMAGES:-false}"
SPLIT_BUILD_PUSH="${SPLIT_BUILD_PUSH:-false}"
PUSH_TIMEOUT_SECONDS="${PUSH_TIMEOUT_SECONDS:-3600}"
CREATE_MANIFEST="${CREATE_MANIFEST:-true}"

DEFAULT_BACKEND_MODULES="
api-gateway
product-service
inventory-service
order-service
notification-service
payment-service
shop-service
customer-service
wallet-service
"

DEFAULT_FRONTEND_APPS="
landing-fe
admin-fe
shop-fe
customer-fe-next
customer-fe-angular
customer-wallet-fe
shop-wallet-fe
"

BACKEND_MODULES="${BACKEND_MODULES:-$DEFAULT_BACKEND_MODULES}"
FRONTEND_APPS="${FRONTEND_APPS:-$DEFAULT_FRONTEND_APPS}"

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

platform_suffix() {
  platform="$1"
  arch=$(printf '%s' "$platform" | cut -d/ -f2)
  variant=$(printf '%s' "$platform" | cut -s -d/ -f3)

  if [ -n "$variant" ]; then
    printf '%s-%s' "$arch" "$variant"
  else
    printf '%s' "$arch"
  fi
}

sleep_seconds() {
  seconds="$1"

  if [ "$seconds" -gt 0 ]; then
    sleep "$seconds"
  fi
}

terminate_process_tree() {
  parent_pid="$1"
  signal="$2"

  if command -v pkill >/dev/null 2>&1; then
    pkill "-$signal" -P "$parent_pid" 2>/dev/null || true
  fi

  kill "-$signal" "$parent_pid" 2>/dev/null || true
}

run_with_timeout() {
  timeout_seconds="$1"
  shift

  "$@" &
  command_pid="$!"
  elapsed_seconds=0

  while kill -0 "$command_pid" 2>/dev/null; do
    if [ "$elapsed_seconds" -ge "$timeout_seconds" ]; then
      echo "Command timed out after ${timeout_seconds}s: $*"
      terminate_process_tree "$command_pid" TERM
      sleep 5

      if kill -0 "$command_pid" 2>/dev/null; then
        terminate_process_tree "$command_pid" KILL
      fi

      wait "$command_pid" 2>/dev/null || true
      return 124
    fi

    sleep 5
    elapsed_seconds=$((elapsed_seconds + 5))
  done

  wait "$command_pid"
}

image_exists() {
  image_ref="$1"

  docker buildx imagetools inspect "$image_ref" >/dev/null 2>&1
}

wait_for_image() {
  image_ref="$1"
  attempt=1

  while [ "$attempt" -le "$REGISTRY_VERIFY_RETRIES" ]; do
    if image_exists "$image_ref"; then
      return 0
    fi

    echo "Image not visible yet: $image_ref (${attempt}/${REGISTRY_VERIFY_RETRIES})"
    attempt=$((attempt + 1))
    sleep_seconds "$REGISTRY_VERIFY_DELAY_SECONDS"
  done

  return 1
}

retry_build() {
  image_ref="$1"
  shift
  attempt=1

  if [ "$RESUME_PUBLISHED_IMAGES" = "true" ] && wait_for_image "$image_ref"; then
    echo "Reusing existing published image $image_ref"
    return 0
  fi

  while [ "$attempt" -le "$BUILD_RETRIES" ]; do
    echo "Building $image_ref (${attempt}/${BUILD_RETRIES})"

    if run_with_timeout "$BUILD_TIMEOUT_SECONDS" "$@"; then
      if wait_for_image "$image_ref"; then
        echo "Pushed and verified $image_ref"
        return 0
      fi

      echo "Build completed but registry verification failed for $image_ref"
    else
      status="$?"
      echo "Build failed for $image_ref with status $status"

      if wait_for_image "$image_ref"; then
        echo "Image is present after failed build; continuing with $image_ref"
        return 0
      fi
    fi

    attempt=$((attempt + 1))

    if [ "$attempt" -le "$BUILD_RETRIES" ]; then
      echo "Retrying $image_ref after ${RETRY_DELAY_SECONDS}s"
      sleep_seconds "$RETRY_DELAY_SECONDS"
    fi
  done

  echo "Failed to build and verify $image_ref"
  return 1
}

retry_split_build_push() {
  image_ref="$1"
  shift
  attempt=1

  if [ "$RESUME_PUBLISHED_IMAGES" = "true" ] && wait_for_image "$image_ref"; then
    echo "Reusing existing published image $image_ref"
    return 0
  fi

  while [ "$attempt" -le "$BUILD_RETRIES" ]; do
    echo "Building local image $image_ref (${attempt}/${BUILD_RETRIES})"

    if ! run_with_timeout "$BUILD_TIMEOUT_SECONDS" "$@"; then
      status="$?"
      echo "Local build failed for $image_ref with status $status"
      attempt=$((attempt + 1))

      if [ "$attempt" -le "$BUILD_RETRIES" ]; then
        echo "Retrying local build $image_ref after ${RETRY_DELAY_SECONDS}s"
        sleep_seconds "$RETRY_DELAY_SECONDS"
      fi

      continue
    fi

    echo "Pushing $image_ref (${attempt}/${BUILD_RETRIES})"

    if run_with_timeout "$PUSH_TIMEOUT_SECONDS" docker push "$image_ref"; then
      if wait_for_image "$image_ref"; then
        echo "Pushed and verified $image_ref"
        return 0
      fi

      echo "Push completed but registry verification failed for $image_ref"
    else
      status="$?"
      echo "Push failed for $image_ref with status $status"

      if wait_for_image "$image_ref"; then
        echo "Image is present after failed push; continuing with $image_ref"
        return 0
      fi
    fi

    attempt=$((attempt + 1))

    if [ "$attempt" -le "$BUILD_RETRIES" ]; then
      echo "Retrying push $image_ref after ${RETRY_DELAY_SECONDS}s"
      sleep_seconds "$RETRY_DELAY_SECONDS"
    fi
  done

  echo "Failed to build, push, and verify $image_ref"
  return 1
}

manifest_has_platform() {
  image_ref="$1"
  platform="$2"

  docker buildx imagetools inspect "$image_ref" | awk -v platform="$platform" '$1 == "Platform:" && $2 == platform { found = 1 } END { exit found ? 0 : 1 }'
}

create_manifest() {
  image_base="$1"
  image_sources="$2"
  final_ref="$image_base:$IMAGE_TAG"
  attempt=1

  for image_ref in $image_sources; do
    if ! wait_for_image "$image_ref"; then
      echo "Cannot create manifest because image is missing: $image_ref"
      return 1
    fi
  done

  while [ "$attempt" -le "$BUILD_RETRIES" ]; do
    echo "Creating multi-arch manifest $final_ref (${attempt}/${BUILD_RETRIES})"

    # shellcheck disable=SC2086
    if docker buildx imagetools create --tag "$final_ref" $image_sources; then
      missing_platform=""

      for platform in $platforms_space; do
        if ! manifest_has_platform "$final_ref" "$platform"; then
          missing_platform="$platform"
          break
        fi
      done

      if [ -z "$missing_platform" ]; then
        echo "Created and verified $final_ref"
        return 0
      fi

      echo "Manifest $final_ref is missing platform $missing_platform"
    else
      echo "Manifest creation failed for $final_ref"
    fi

    attempt=$((attempt + 1))

    if [ "$attempt" -le "$BUILD_RETRIES" ]; then
      echo "Retrying manifest $final_ref after ${RETRY_DELAY_SECONDS}s"
      sleep_seconds "$RETRY_DELAY_SECONDS"
    fi
  done

  echo "Failed to create and verify $final_ref"
  return 1
}

for module in $BACKEND_MODULES; do
  mvn -Pdocker-build -DskipTests -pl "$module" clean package

  image_base="docker.io/$DOCKER_USERNAME/$module"
  image_sources=""

  for platform in $platforms_space; do
    suffix=$(platform_suffix "$platform")
    image_ref="$image_base:$IMAGE_TAG-$suffix"

    if [ "$SPLIT_BUILD_PUSH" = "true" ]; then
      retry_split_build_push "$image_ref" \
        docker buildx build \
        --progress "$DOCKER_BUILD_PROGRESS" \
        --platform "$platform" \
        --tag "$image_ref" \
        --build-arg "JAR_FILE=target/$module-*.jar" \
        --file docker/spring-boot/Dockerfile \
        --load \
        "$module"
    else
      retry_build "$image_ref" \
        docker buildx build \
        --progress "$DOCKER_BUILD_PROGRESS" \
        --platform "$platform" \
        --tag "$image_ref" \
        --build-arg "JAR_FILE=target/$module-*.jar" \
        --file docker/spring-boot/Dockerfile \
        --push \
        "$module"
    fi

    image_sources="$image_sources $image_ref"
  done

  if [ "$CREATE_MANIFEST" = "true" ]; then
    create_manifest "$image_base" "$image_sources"
  fi
done

for app in $FRONTEND_APPS; do
  image_base="docker.io/$DOCKER_USERNAME/$app"
  image_sources=""

  for platform in $platforms_space; do
    suffix=$(platform_suffix "$platform")
    image_ref="$image_base:$IMAGE_TAG-$suffix"

    if [ "$SPLIT_BUILD_PUSH" = "true" ]; then
      retry_split_build_push "$image_ref" \
        docker buildx build \
        --progress "$DOCKER_BUILD_PROGRESS" \
        --platform "$platform" \
        --tag "$image_ref" \
        --load \
        "$app"
    else
      retry_build "$image_ref" \
        docker buildx build \
        --progress "$DOCKER_BUILD_PROGRESS" \
        --platform "$platform" \
        --tag "$image_ref" \
        --push \
        "$app"
    fi

    image_sources="$image_sources $image_ref"
  done

  if [ "$CREATE_MANIFEST" = "true" ]; then
    create_manifest "$image_base" "$image_sources"
  fi
done
