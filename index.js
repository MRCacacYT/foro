'use strict'

const crumb = require('crumb')
const hapiDevErrors = require('hapi-dev-errors')
const Hapi = require('@hapi/hapi')
const handlerbars = require('./lib/helpers')
const inert = require('@hapi/inert')
const good = require('good')
const methods = require('./lib/methods')
const path = require('path')
const routes = require('./routes')
const site = require('./controllers/site')
const vision = require('@hapi/vision')
const balnkie = require('blankie')
const scooter = require('@hapi/scooter')

const server = Hapi.server({
  port: process.env.PORT || 3000,
  host: 'localhost',
  routes: {
    files: {
      relativeTo: path.join(__dirname, 'public')
    }
  }
})

async function init () {
  try {
    await server.register(inert)
    await server.register(vision)
    await server.register({
      plugin: good,
      options: {
        reporters: {
          console: [
            {
              module: 'good-console'
            },
            'stdout'
          ]
        }
      }
    })

    // se supone que esto mejora mi css pero no se :D
  //   await server.register([scooter,{
  //     plugin: balnkie,
  //     options: {
  //       defaultSrc: `'self' 'unsafe-inline'`,
  //       styleSrc: `'self 'unsafe-inline' https://maxcdn.bootstrapcdn.com`,
  //       fontSrc: `'self' 'unsafe-inline' data:`,
  //       scriptSrc: `'self 'unsafe-inline' https://cdnjs.cloudflare.com https://maxcdn.bootstrapcdn.com https://code.jquery.com/`,
  //       generateNonces: false
  //     }
  // }])

  await server.register({
    plugin: hapiDevErrors,
    options: {
      showErrors: process.env.NODE_ENV !== 'prod'
    }
  })

    await server.register({
      plugin: crumb,
      options: {
        cookieOptions: {
          isSecure: process.env.NODE_ENV === 'prod'
        }
      }
    })

    await server.register({
      plugin: require('./lib/api'),
      options: {
        prefix: 'api'
      }
    })


    server.method('setAnswerRight', methods.setAnswerRight)
    server.method('getLast', methods.getLast, {
      cache: {
        expiresIn: 1000 * 60,
        generateTimeout: 2000
      }
    })

    server.state('user', {
      ttl: 1000 * 60 * 60 * 24 * 7,
      isSecure: process.env.NODE_ENV === 'prod',
      encoding: 'base64json'
    })

    server.views({
      engines: {
        hbs: handlerbars
      },
      relativeTo: __dirname,
      path: 'views',
      layout: true,
      layoutPath: 'views'
    })

    server.ext('onPreResponse', site.fileNotFound)
    server.route(routes)

    await server.start()
  } catch (error) {
    server.log('error', error)
    process.exit(1)
  }

  server.log('info', `Servidor lanzado en: ${server.info.uri}`)
}

process.on('unhandledRejection', error => {
  server.log('UnhandledRejection', error)
})

process.on('unhandledException', error => {
  server.log('unhandledException', error)
})

init()
