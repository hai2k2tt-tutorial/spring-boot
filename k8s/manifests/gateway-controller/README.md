# NGINX Gateway Fabric

Install the Gateway API CRDs and the NGINX Gateway Fabric controller with:

```bash
./k8s/manifests/gateway-controller/install.sh
```

The install script applies both Gateway API CRDs and NGINX Gateway Fabric CRDs
before installing the controller chart.

For local `kind`, this repo exposes the Gateway listener on:

- `http://localhost:8080`
- `https://localhost:8443`

Those host ports map to the NodePorts configured in [values.yaml](./values.yaml)
and in [k8s/kind/kind-config.yaml](../../kind/kind-config.yaml).
