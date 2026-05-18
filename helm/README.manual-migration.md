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

## Open Database Tunnels

Run these commands on the VPS:

```bash
kubectl port-forward -n microservices svc/postgres 15432:5432 >/tmp/pf-postgres.log 2>&1 &
```

Run this command on the local machine:

```bash
ssh -N \
  -L 15432:127.0.0.1:15432 \
  root@103.6.234.153
```

Keep that SSH tunnel open while running migrations.

## Run Migrations

From the repository root on the local machine:

```bash
M2_REPO=/private/tmp/m2repo

mvn -Dmaven.repo.local="$M2_REPO" -f pom.xml -pl product-service -DskipTests \
  -Dliquibase.url=jdbc:postgresql://localhost:15432/product_service \
  -Dliquibase.username=postgres \
  -Dliquibase.password=postgres \
  liquibase:update

mvn -Dmaven.repo.local="$M2_REPO" -f pom.xml -pl payment-service -DskipTests \
  -Dliquibase.url=jdbc:postgresql://localhost:15432/payment_service \
  -Dliquibase.username=postgres \
  -Dliquibase.password=postgres \
  liquibase:update

mvn -Dmaven.repo.local="$M2_REPO" -f pom.xml -pl shop-service -DskipTests \
  -Dliquibase.url=jdbc:postgresql://localhost:15432/shop_service \
  -Dliquibase.username=postgres \
  -Dliquibase.password=postgres \
  liquibase:update

mvn -Dmaven.repo.local="$M2_REPO" -f pom.xml -pl customer-service -DskipTests \
  -Dliquibase.url=jdbc:postgresql://localhost:15432/customer_service \
  -Dliquibase.username=postgres \
  -Dliquibase.password=postgres \
  liquibase:update

mvn -Dmaven.repo.local="$M2_REPO" -f pom.xml -pl order-service -DskipTests \
  -Dliquibase.url=jdbc:postgresql://localhost:15432/order_service \
  -Dliquibase.username=postgres \
  -Dliquibase.password=postgres \
  liquibase:update

mvn -Dmaven.repo.local="$M2_REPO" -f pom.xml -pl inventory-service -DskipTests \
  -Dliquibase.url=jdbc:postgresql://localhost:15432/inventory_service \
  -Dliquibase.username=postgres \
  -Dliquibase.password=postgres \
  liquibase:update
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

Run the migrations from the local machine, then start the services:

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
