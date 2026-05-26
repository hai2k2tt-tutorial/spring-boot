# Manual Database Migrations

Runtime Liquibase is disabled in the services:

```properties
spring.liquibase.enabled=false
spring.jpa.hibernate.ddl-auto=validate
```

That means database migrations must be run manually before starting or restarting services that validate schema.

## Databases

Postgres service databases:

- `product_service`
- `payment_service`
- `shop_service`
- `customer_service`
- `order_service`
- `inventory_service`

All application service databases use the shared `postgres` service. Keycloak still uses its own MySQL database.

Do not reset infrastructure databases such as Keycloak unless that is the intended operation.

## Run Migrations On The VPS

SSH into the VPS and use the repository checkout there:

```bash
ssh root@103.6.234.153
cd /root/spring-boot
git fetch origin master
git checkout --detach origin/master
```

Run migrations from the VPS. This keeps PostgreSQL accessible only inside the cluster/VPS network:

```bash
LIQUIBASE_USERNAME=postgres LIQUIBASE_PASSWORD=postgres \
LIQUIBASE_URL=jdbc:postgresql://postgres.microservices.svc.cluster.local:5432/product_service \
sh product-service/scripts/db.sh update

LIQUIBASE_USERNAME=postgres LIQUIBASE_PASSWORD=postgres \
LIQUIBASE_URL=jdbc:postgresql://postgres.microservices.svc.cluster.local:5432/payment_service \
sh payment-service/scripts/db.sh update

LIQUIBASE_USERNAME=postgres LIQUIBASE_PASSWORD=postgres \
LIQUIBASE_URL=jdbc:postgresql://postgres.microservices.svc.cluster.local:5432/shop_service \
sh shop-service/scripts/db.sh update

LIQUIBASE_USERNAME=postgres LIQUIBASE_PASSWORD=postgres \
LIQUIBASE_URL=jdbc:postgresql://postgres.microservices.svc.cluster.local:5432/customer_service \
sh customer-service/scripts/db.sh update

LIQUIBASE_USERNAME=postgres LIQUIBASE_PASSWORD=postgres \
LIQUIBASE_URL=jdbc:postgresql://postgres.microservices.svc.cluster.local:5432/order_service \
sh order-service/scripts/db.sh update

LIQUIBASE_USERNAME=postgres LIQUIBASE_PASSWORD=postgres \
LIQUIBASE_URL=jdbc:postgresql://postgres.microservices.svc.cluster.local:5432/inventory_service \
sh inventory-service/scripts/db.sh update
```

Check pending changes before updating by replacing `update` with `status`.

## Restart Services

After successful migrations, restart only the affected services:

```bash
kubectl rollout restart deployment/product-service -n microservices
kubectl rollout status deployment/product-service -n microservices --timeout=300s
```

## Reset And Remigrate

Use this only when the existing database schema does not match the current changelogs or entity mappings.

On the VPS, stop application pods first:

```bash
kubectl scale deployment -n microservices \
  product-service payment-service shop-service customer-service order-service inventory-service \
  --replicas=0
```

Reset service databases:

```bash
POSTGRES_POD=$(kubectl get pod -n microservices -l app=postgres -o jsonpath='{.items[0].metadata.name}')

for db in product_service payment_service shop_service customer_service order_service inventory_service; do
  kubectl exec -n microservices "$POSTGRES_POD" -- psql -U postgres -d postgres -c \
    "DROP DATABASE IF EXISTS ${db} WITH (FORCE);"
  kubectl exec -n microservices "$POSTGRES_POD" -- psql -U postgres -d postgres -c \
    "CREATE DATABASE ${db};"
done
```

Run the migrations from the VPS, then start the services:

```bash
kubectl scale deployment -n microservices \
  product-service payment-service shop-service customer-service order-service inventory-service \
  --replicas=1
```

Verify:

```bash
kubectl get pods -n microservices
kubectl logs -n microservices deploy/inventory-service --tail=120
kubectl logs -n microservices deploy/order-service --tail=120
```
