<p align="center"><img width="300px" src="docs/logo.png" />
</p>
<h1 align="center" >nodeblocks-service-template</h1>
<p align="center">A nodeblocks service template using a guest order as example</p>

---

## 🔰 Setup

**Install NVM**

- [OSX / Linux](https://github.com/nvm-sh/nvm#installing-and-updating)
- [Windows](https://github.com/coreybutler/nvm-windows)

**Set Node Version**

```sh
nvm use
```

## 🛠 Environment Variables

#### Global Variables

`NODEBLOCKS_DEV_TOKEN` is required to install private packages. This token will be provided by Nodeblocks team. Set `NODEBLOCKS_DEV_TOKEN` in your local environment before proceeding.

```sh
export NODEBLOCKS_DEV_TOKEN=__INSERT_YOUR_TOKEN_HERE__
```

#### Project Variables

**Initialize the env file:**

```sh
cp .env.default .env
```

**Set the correct values in the .env file:**

| Name                  | Description                   | Default Value |
| --------------------- | ----------------------------- | ------------- |
| AUTH_ENC_SECRET       | encryption key                | -             |
| AUTH_SIGN_SECRET      | secret key                    | -             |
| DATABASE_URL          | service db url                | -             |
| ORDER_PORT            | port number                   | -             |
| ORDER_ENDPOINT        | order service endpoint        | -             |
| CATALOG_ENDPOINT      | catalog service endpoint      | -             |
| USER_ENDPOINT         | user service endpoint         | -             |
| ORGANIZATION_ENDPOINT | organization service endpoint | -             |

#### ⚠️ NOTE

`AUTH_ENC_SECRET` & `AUTH_ENC_SECRET` should be the same across all services

## 🪄 Usage

**Install project dependencies**

```sh
npm ci
```

**Run**

```sh
npm run start:dev
```
