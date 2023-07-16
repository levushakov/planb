// 1. terminal 1: node index.js 
// --> generates public key <pkey1> and stores values in ./store1.  
// 2. terminal 2: node index.js ./other-store <pkey1> --> generates <pkey2>
// 3. exit terminal 1 and execute node index.js ./store <pkey2>
// 4. programs can chat between each other

import Corestore from 'corestore'
import Hyperswarm from 'hyperswarm'

// docs.holepunch.to for more info

const storePath = process.argv[2] || './store'
const coreKey = process.argv[3]
const store = new Corestore(storePath)

const core = store.get({ name: 'local-chat', valueEncoding: 'json' })

const keys = process.argv.slice(3)

for (const key of keys) {
  const otherCore = store.get({ key: Buffer.from(key, 'hex'), valueEncoding: 'json' })

  await otherCore.ready()

  console.log('listening for', otherCore.key.toString('hex'))

  otherCore.on('append', function () {
    console.log('new messages appended...', otherCore.length)
  })

  const start = Math.max(0, otherCore.length - 10)
  otherCore.createReadStream({ start, live: true })
    .on('data', function (data) {
      console.log('-->', data)
    })
}

await core.ready()

const swarm = new Hyperswarm({
  keyPair: await store.createKeyPair('local-chat')
})

const topic = Buffer.alloc(32).fill('Lugano')
swarm.join(topic)
swarm.on('connection', function (connection) {
  console.log('new connection from', connection.remotePublicKey.toString('hex'))
  store.replicate(connection)
})

console.log(core.length, '<-- core.length')
console.log(core.key.toString('hex'), '<-- my public key')

process.stdin.on('data', function (msg) {
  core.append({
    timestamp: Date.now(),
    message: msg.toString().trim()
  })
})

// const lastBlock = await core.get(core.length - 1)

// console.log(lastBlock.toString())