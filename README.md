# Maha Pickels catalog repository

This repository is the private source of truth for the storefront catalog. The Expo owner editor commits `catalog.json` and new files under `assets/` to `main` in one Git commit. GitHub Actions validates the complete catalog and publishes the two directories as a public GitHub Pages artifact only after validation succeeds.

## Local validation

```sh
npm ci
npm run catalog:validate
```

The `vendor/catalog-contract` directory is the checked-in 1.0.0 release snapshot of the package shared with the storefront and editor. Keep it in sync whenever the contract version changes. Images in this repository are referenced by absolute Pages URLs and are never deleted automatically. Keep the old file until a later cleanup confirms that no catalog record references it.

## GitHub setup

Create this as a private repository, push the contents to `main`, and enable GitHub Pages with **GitHub Actions** as the source. Replace the example owner in all published image URLs and in the editor configuration before the first live save. The Pages URL is:

```text
https://<github-owner>.github.io/maha-catalog/catalog.json
```

The fine-grained editor token only needs repository contents read/write on this one repository. It must not be put in the storefront or any `VITE_*` variable.
