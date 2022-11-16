# Troubleshooting

If `pbiviz start` command does not work, try the following actions.

1. Delete existing certificates.

```Powershell
rm $env:appdata/npm/node_modules/powerbi-visuals-tools/certs/*
```

2. Generate a certificate manually.

```Powershell
cd $env:appdata/npm/node_modules/powerbi-visuals-tools/certs
& 'C:\Program Files\Git\usr\bin\openssl.exe' req -x509 -newkey rsa:4096 -keyout powerbi_private.key -out powerbi_public.crt
& 'C:\Program Files\Git\usr\bin\openssl.exe' pkcs12 -export -out powerbi_public.pfx -inkey powerbi_private.key -in powerbi_public.crt -descert
```

`-descert` is necessary because Node.js no longer supports RC2 and the certificate should be encrypted using triple DES.

3. Update the config file. (privateKey, certificate, pfx and passphrase)

```Powershell
code $env:appdata/npm/node_modules/powerbi-visuals-tools/config.json
```

4. Run `pbiviz start` and reload the visual.

Go to `https://localhost:8080/`. Click the `advanced` button on the warning page and then `Proceed to localhost (unsafe)`. Return to the power bi developer visual and reload it.
