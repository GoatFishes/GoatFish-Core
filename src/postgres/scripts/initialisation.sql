-- Stores the bots that have been created so far
CREATE TABLE BOTS (
    ID           bigserial     NOT NULL PRIMARY KEY
  , BOT_ID       text          NOT NULL 
  , STRATEGY     text          NOT NULL
  , PERFORMANCE  float         NOT NULL
  , MARGIN       float         NOT NULL
  , PORT_N       integer       NOT NULL
  , PAIR         jsonb
  , _STATUS      text          NOT NULL
);

CREATE TABLE WEBSOCKETS (
    ID           bigserial     NOT NULL PRIMARY KEY
  , EXCHANGE      text          NOT NULL 
  , TIME_FRAME    text          NOT NULL
  , ASSET         text         NOT NULL
);

-- Stores a daily record of the margin amount from all bots
CREATE TABLE MARGIN (
    ID           bigserial     NOT NULL PRIMARY KEY
  , BOT_ID       text          NOT NULL
  , _TIMESTAMP   timestamptz   NOT NULL
  , AMOUNT       float         NOT NULL
);

-- Stores the API keys to every bot in the system
CREATE TABLE BOT_KEYS (
   ID        bigserial      NOT NULL PRIMARY KEY
  ,BOT_ID    text           NOT NULL 
  ,BOT_KEY   jsonb          NOT NULL
  ,EXCHANGE  text           NOT NULL
);

-- Stores the API keys to every bot in the system
CREATE TABLE EXCHANGE_KEYS (
   ID             bigserial      NOT NULL PRIMARY KEY
  ,EXCHANGE       text           NOT NULL
  ,EXCHANGE_KEY   jsonb          NOT NULL
);



CREATE TABLE PAPER_POSITION (
   ID                     bigserial       NOT NULL PRIMARY KEY
   ,POSITION_ID           text            NOT NULL
   ,BOT_ID                text            NOT NULL
   ,ENTRY_PRICE           float           NOT NULL
   ,INIT_MARGIN           float           NOT NULL -- Denoted in 8 decimals like btc
   ,START_TIME            timestamptz     NOT NULL
   ,END_TIME              timestamptz     NOT NULL
   ,SIDE                  text            NOT NULL
   ,SIZE                  float            NOT NULL
   ,PROFIT_LOSS           float            NOT NULL
   ,ROE                   float            NOT NULL
   ,LEVERAGE              float            NOT NULL
   ,AVERAGE_PRICE         float            NOT NULL
);

CREATE TABLE PAPER_ORDERS (
   ID               bigserial       NOT NULL PRIMARY KEY
  ,BOT_ID           text            NOT NULL
  ,EXCHANGE         text            NOT NULL
  ,ORDER_ID         text            NOT NULL
  ,POSITION_REF     text
  ,_TIMESTAMP       timestamptz     NOT NULL
  ,ORDER_STATUS     text            NOT NULL 
  ,SIDE             text            NOT NULL
  ,SIZE             float           NOT NULL
  ,_PRICE           float           NOT NULL
  ,MARGIN           float           NOT NULL -- Denoted in 8 decimals like btc
  ,LEVERAGE         integer         NOT NULL
  ,ORDER_TYPE       text            NOT NULL
  ,AVERAGE_PRICE    float           
);

-- Stores all the trades that have been carried out during backtesting
CREATE TABLE POSITION (
   ID                     bigserial       NOT NULL PRIMARY KEY
   ,POSITION_ID           text            NOT NULL
   ,BOT_ID                text            NOT NULL
   ,ENTRY_PRICE           float           NOT NULL
   ,INIT_MARGIN           float           NOT NULL -- Denoted in 8 decimals like btc
   ,START_TIME            timestamptz     NOT NULL
   ,END_TIME              timestamptz     NOT NULL
   ,SIDE                  text            NOT NULL
   ,SIZE                  float            NOT NULL
   ,PROFIT_LOSS           float            NOT NULL
   ,ROE                   float            NOT NULL
   ,LEVERAGE              float            NOT NULL
   ,AVERAGE_PRICE         float            NOT NULL
);

CREATE TABLE ORDERS (
   ID               bigserial       NOT NULL PRIMARY KEY
  ,BOT_ID           text            NOT NULL
  ,EXCHANGE         text            NOT NULL
  ,ORDER_ID         text            NOT NULL
  ,POSITION_REF     text
  ,_TIMESTAMP       timestamptz     NOT NULL
  ,ORDER_STATUS     text            NOT NULL 
  ,SIDE             text            NOT NULL
  ,SIZE             float           NOT NULL
  ,_PRICE           float           NOT NULL
  ,MARGIN           float           NOT NULL -- Denoted in 8 decimals like btc
  ,LEVERAGE         integer         NOT NULL
  ,ORDER_TYPE       text            NOT NULL
  ,AVERAGE_PRICE    float           
);

-- Stores all the trades that have been carried out during backtesting
CREATE TABLE BACKTEST_TRADE (
   ID               bigserial      NOT NULL PRIMARY KEY
  ,SYMBOL           text           NOT NULL
  ,SIDE             text           NOT NULL
  ,ORDER_QTY        integer        NOT NULL
  ,PRICE            float          NOT NULL
  ,ORDER_TYPE       text           NOT NULL
  ,TIME_IN_FORCE    text           NOT NULL
  ,LEVERAGE         integer        NOT NULL
  ,_TIMESTAMP       timestamptz    NOT NULL
);

-- Stores all the trades that have been carried out during backtesting
CREATE TABLE TEST_PERFORMANCE (
   ID               bigserial       NOT NULL PRIMARY KEY
  ,AVG_TIME         float           NOT NULL 
  ,AVERAGE_PROFIT   float           NOT NULL
  ,OVERALL_PROFIT   float           NOT NULL 
  ,NUMBER_OF_TRADES float           NOT NULL  
  ,SHARPE_RATIO     float           NOT NULL 
  ,LONGEST_TRADE    float           NOT NULL
  ,SHORTEST_TRADE   float           NOT NULL
  ,BEST_TRADE       float           NOT NULL
  ,WORST_TRADE      float           NOT NULL
);


CREATE TABLE PRICE_HISTORY (
   ID             bigserial       NOT NULL PRIMARY KEY
  ,PAIR           text            NOT NULL 
  ,TIME_FRAME      text            NOT NULL
  ,EXCHANGE       text            NOT NULL
  ,_TIMESTAMP     timestamptz     NOT NULL 
  ,_OPEN          float           NOT NULL  
  ,_CLOSE         float           NOT NULL 
  ,_HIGH          float           NOT NULL
  ,_LOW           float           NOT NULL
  ,_VOLUME        float           NOT NULL
);

