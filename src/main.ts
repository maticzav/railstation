import fastify from 'fastify'
import { z } from 'zod'

async function main() {
  // https://docs.railway.com/reference/variables#railway-provided-variables
  const RAILWAY_REGION = process.env.RAILWAY_REPLICA_REGION
  const RAILWAY_DOMAIN = process.env.RAILWAY_PUBLIC_DOMAIN

  const RAILMAP_URL = process.env.RAILMAP_URL

  console.log('RAILMAP_URL', RAILMAP_URL)
  console.log('RAILWAY_REGION', RAILWAY_REGION)
  console.log('RAILWAY_DOMAIN', RAILWAY_DOMAIN)

  let PORT = 3000
  try {
    if (process.env.PORT) {
      PORT = parseInt(process.env.PORT)
    }
  } catch (error) {
    console.error('Invalid PORT', error)
  }

  console.log('PORT', PORT)

  // Create a CRON

  let interval: NodeJS.Timeout

  interval = setInterval(async () => {
    try {
      console.log('Pinging Railmap')

      // NOTE: This advertises a service to the Railmap and gets back a list of services to ping.
      const response = await fetch(`${RAILMAP_URL}/api/list`, {
        method: 'POST',
        body: JSON.stringify({
          region: RAILWAY_REGION,
          domain: RAILWAY_DOMAIN,
        }),
      }).then((res) => res.json())

      const data = z.object({
        stops: z.array(
          z.object({
            domain: z.string(),
            url: z.string(),
          }),
        ),
      })

      const parsed = data.parse(response)

      console.log('Parsed Railmap', parsed)

      const tasks = parsed.stops.map(async (stop) => {
        const start = performance.now()

        await fetch(`http://${stop.domain}/ping`, { method: 'GET' })

        const end = performance.now()

        return {
          domain: stop.domain,
          pingMs: end - start,
        }
      })

      const results = await Promise.all(tasks)

      const body = {
        region: RAILWAY_REGION,
        domain: RAILWAY_DOMAIN,
        results,
      }

      console.log(`${RAILMAP_URL}/api/report`, body)

      await fetch(`${RAILMAP_URL}/api/report`, {
        method: 'POST',
        body: JSON.stringify(body),
      })

      console.log('Reported to Railmap', results)
    } catch (error) {
      console.error('Error pinging Railmap', error)
    }
  }, 1000 * 5)

  // Start the server

  const app = fastify()

  app.get('/', (req, res) => {
    res.send(`Railstation ${RAILWAY_REGION}!`)
  })

  app.get('/health', (req, res) => {
    res.send('ok')
  })

  app.get('/ping', (req, res) => {
    res.send('pong')
  })

  app.listen({ port: PORT, host: '0.0.0.0' }, (err, address) => {
    if (err) {
      console.error(err)
      process.exit(1)
    }

    console.log(`Server is running on ${address}`)
  })
}

if (require.main === module) {
  main().catch(console.error)
}
