Install
-------

1. Download and install nvm from this GitHub link: https://github.com/nvm-sh/nvm

    Make sure to launch a new shell to pick up new environment variables.

2. Install node version 17.9.1

> nvm install 17.9.1
> node -v
v17.9.1

3. Install the node dependencies.

> cd odyssey-service
> npm install

# Set Visual Studio Code to compile typescript files on save.

In Visual Studio Code: Terminal menu --> Run Task... 
    > tsc: watch - tsconfig.json    

Note: this doesn't work reliably...

Trying this approach: https://enji.systems/2022/10/30/typescript-auto-compile-vs-code.html

4. Run the tests.

Note: you may have to run this to get the typescript compiled:
> npm run build

> npm test


5. To Debug the tests or code:

Note: you may have to run this to get the typescript compiled:
> npm run build

    In Visual Studio Code --> Run and Debug --> Run Script: test

    This will run and debug whatever is configured in package.json under script --> test.


6. Run the web service.

Note: need to build the typescript files into js files to give effect to latest changes.
Also note: if you did "tsc: watch ..." command above then compilation will happen on each file save - which is better.
> npm run build

> npm start

