# Troubleshooting

If `pbiviz start` command does not work, delete existing certificates and install a new certificate.

```Powershell
rm $env:appdata/npm/node_modules/powerbi-visuals-tools/certs/*
pbiviz --install-cert
```

One a new certificate is installed, run `pbiviz start` and go to `https://localhost:8080/`. Click the `advanced` button on the warning page and then `Proceed to localhost (unsafe)`. Finally, go to the power bi developer visual and reload it.
