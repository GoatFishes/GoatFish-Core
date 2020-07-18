
<p align="center">
  <img align="center" height="200px" width="173px"  src="/src/utils/img/goatfishLogo.png"></img>
  <h1 align="center"> GoatFish </h1>
</p>

<p align="center">
  <a href="https://www.codacy.com/manual/LucasRodriguez/GoatFish?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=LucasRodriguez/GoatFish&amp;utm_campaign=Badge_Grade"><img src="https://app.codacy.com/project/badge/Grade/c2a5e4cd566749ef9b6322490f75a92a"/></a>
  
  <img alt="GitHub issues" src="https://img.shields.io/github/issues/LucasRodriguez/GoatFish">
  
  <img alt="David" src="https://img.shields.io/badge/dependencies-up%20to%20date-brightgreen.svg">
    
  <img alt="APM" src="https://img.shields.io/badge/license-MIT-blue.svg">
  
</p>

<p align="center">

  <img alt="APM" src="https://img.shields.io/badge/Documentation-available-brightgreen">
  
</p>

## Pre-requisites
[Make](https://askubuntu.com/questions/161104/how-do-i-install-make), [Git](https://git-scm.com/), [Node](https://nodejs.org/en/download), [Docker](https://docs.docker.com/get-docker/), 2 set of API keys for [Bitmex](https://www.bitmex.com/register/uMNVsK) or any other of the supported exchanges


### Application set up

Create a local copy of the project in your server or localhost:

```git clone git@github.com:LucasRodriguez/GoatFish.git```

Run the installation script:

```make install```

At this point a clean install of the CLI should be available

### Testing 

It is highly recommended to test the application before running any startegies. 

To test the code run:

```npx init goatfish```

The CLI will then ask whether you want to run a new command, wipe the data or test the application.
Select Test 

The CLI will then request a series of API keys, provide them in the order specified. 
The CLI should Return the number of passed tests 

Were any of the the tests fail, please refer to the [trouble shooting guide](https://www.youtube.com/watch?v=dQw4w9WgXcQ&feature=youtu.be)


### Strategy Setup

To set up your first strategy firstly run:

```npx init goatfish```

The CLI will then ask whether you want to run a new command, wipe the data, or test the application

- Select new command   
- Select upload strategy
- Introduce the following data:
  - API keys
  - Exchange name
  - Bot id
  - File/Folder containing the strategy
  - Timeframes
  - Coin pairs

 - Confirm all the Information
 
The bot should now be watching the specified markets and keeping tabs on its progress

To corroborate the bot is currently running:

```npx init goatfish```

The CLI will then ask whether you want to run a new command, wipe the data or test the application:

- Select new command   
- Select active bots
- The bot id assigned above should appear as part of the list of running bots
