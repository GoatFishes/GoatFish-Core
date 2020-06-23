const { RESPONSE_CODES, LOG_LEVELS } = require('./constants')
const logEvent = require('./logger')

const { pipe, get } = require('rubico')
const kafka = require('kafka-node'),
    Consumer = kafka.Consumer,
    ConsumerGroup = kafka.ConsumerGroup,
    client = new kafka.KafkaClient({ kafkaHost: 'kafka:9092' }),
    offset = new kafka.Offset(client)

let liveTradeConsumer
let paperTradeConsumer

// safely accesses properties with get
const safeParseTopic = (topic, data) => get([topic, 0, 0])(data)

// changed this to return a Promise
const fetchLatestOffset = topic => new Promise((resolve, reject) => {
    offset.fetch(
        [{ topic: topic, partition: 0, time: -1 }],
        (err, data) => err ? reject(err) : resolve(safeParseTopic(topic, data)),
    )
})

// it's recommend to create new client for different consumers
// https://www.npmjs.com/package/kafka-node#consumer
const makeConsumerInstance = (topic, offset) => new Consumer(
    new kafka.KafkaClient({ kafkaHost: 'kafka:9092' }),
    [{ topic: topic, offset: offset, partition: 0 }],
    { autoCommit: true },
)

// this is the function version of KafkaConsumer from your example
// consume(consumerInstance) == KafkaConsumer
const consume = consumerInstance => new Promise((resolve, reject) => {
    const messages = []

    consumerInstance.on('message', message => {
        messages.push(message)
        // you don't need to pause and resume
        // you are gauranteed one message at a time in this block
        if (message.offset == (message.highWaterOffset - 1)) {
            consumerInstance.close(true, function (err, message) { })
            resolve(messages)
            // you have to handle cleanup of consumerInstance after the resolve
            // If there's a memory leak, I would look here
        }
    })

    // handles a termination signal from the producer
    consumerInstance.on('end', () => resolve(messages))

    consumerInstance.on('error', reject)
})

// topic -> messages
// pipe chains async functions together
const consumer = topic => pipe([
    fetchLatestOffset, // topic -> latestOffset

    latestOffset => makeConsumerInstance(topic, latestOffset),
    // latestOffset -> consumerInstance

    consume, // consumerInstance -> messages
])(topic)


const groupConsumer = async (groupId, topic) => {
    logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Instantiating ${groupId} Consumer`)
    let consumerGroup
    var options = {
        // connect directly to kafka broker (instantiates a KafkaClient)
        host: 'zookeper:2181',
        batch: undefined, // put client batch settings if you need them
        ssl: true, // optional (defaults to false) or tls options hash
        kafkaHost: 'kafka:9092',
        groupId: groupId,
        autoCommit: true,
        sessionTimeout: 15000,
        // An array of partition assignment protocols ordered by preference.
        // 'roundrobin' or 'range' string for built ins (see below to pass in custom assignment protocol)
        protocol: ['roundrobin'],
        encoding: 'utf8', // default is utf8, use 'buffer' for binary data

        // Offsets to use for new groups other options could be 'earliest' or 'none' (none will emit an error if no offsets were saved)
        // equivalent to Java client's auto.offset.reset
        fromOffset: 'latest', // default
        commitOffsetsOnFirstJoin: true, // on the very first time this consumer group subscribes to a topic, record the offset returned in fromOffset (latest/earliest)
        // how to recover from OutOfRangeOffset error (where save offset is past server retention) accepts same value as fromOffset
        outOfRangeOffset: 'earliest', // default
        // Callback to allow consumers with autoCommit false a chance to commit before a rebalance finishes
        // isAlreadyMember will be false on the first connection, and true on rebalances triggered after that
        onRebalance: (isAlreadyMember, callback) => { callback(); } // or null
    };

    groupId == `${process.env.BOTNAME}Group` ? liveTradeConsumer = await new ConsumerGroup(options, topic) : paperTradeConsumer = await new ConsumerGroup(options, topic)
    groupId == `${process.env.BOTNAME}Group` ? consumerGroup = liveTradeConsumer : consumerGroup = paperTradeConsumer

    return consumerGroup
}

const pauseConsumer = async (groupId) => {

    groupId == `${process.env.BOTNAME}Group` ? consumerGroup = liveTradeConsumer : consumerGroup = paperTradeConsumer

    logEvent(LOG_LEVELS.info, RESPONSE_CODES.LOG_MESSAGE_ONLY, `Closing ${groupId} Consumer`)

    await consumerGroup.close(true, function (err, message) { });

    return

}

module.exports = { groupConsumer, pauseConsumer, consumer }
