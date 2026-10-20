# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

   If your phone cannot reach the development server over LAN, use a tunnel:

   ```bash
   npx expo start --tunnel --clear
   ```

   Stop the existing server with `Ctrl+C` before restarting. Use Expo Go compatible
   with SDK 57. After changing native dependencies, restart Metro with `--clear`;
   development builds also need to be rebuilt. Keep native package versions aligned
   with the SDK using `npx expo install --check` and `npx expo install <package>`.
   A working tunnel does not prevent errors caused by incompatible native modules.

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **src/app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Deploy the web app with Docker

The image serves the Expo web app with nginx on port 80, not the Expo
development server. Web output is `static`: Expo exports HTML and assets into
`dist`, which the image copies into the nginx document root. Server rendering
and API routes require a separate server deployment.

Build and publish after authenticating to GHCR with an account that can push:

```bash
docker build --no-cache -t ghcr.io/hosung98/pace-frontend:v1 .
docker push ghcr.io/hosung98/pace-frontend:v1
```

On the deployment host:

```bash
docker pull ghcr.io/hosung98/pace-frontend:v1
docker run -d --name pace-frontend -p 8080:80 ghcr.io/hosung98/pace-frontend:v1
```

Open `http://localhost:8080` on that host. If a container already exists, stop
and remove that container before running its replacement. Pushing the same tag
does not update running containers: pull the new image and recreate them.
Build for the deployment host's CPU architecture if it differs from the build
machine.

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **example** directory and create a blank **src/app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
