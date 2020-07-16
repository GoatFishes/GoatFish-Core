var kafka = require('kafka-node'),
    Producer = kafka.Producer,
    client = new kafka.KafkaClient({ kafkaHost: 'kafka:9092' }),
    producer = new Producer(client)

const kafkaProduce = async (topic, message) => {
    payloads = [
        { topic: topic, messages: JSON.stringify(message), partition: 0 }
    ]
    // Send the messages to the Kafka Broker
    await producer.send(payloads, async function (err, data) {
    })
    return
}

module.exports = { kafkaProduce }
