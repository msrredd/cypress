const _ = require('lodash')
const path = require('path')
const { parse } = require('@babel/parser')
const traverse = require('@babel/traverse').default
const generate = require('@babel/generator').default
const b = require('ast-types').builders
const md5 = require('md5')

module.exports = function (source, map, meta) {
  const { emitFile, resourcePath } = this

  // options that can be passed to `parse`. may need some variation on this
  // const options = {
  //   errorRecovery: true,
  //   sourceType: 'unambiguous',
  //   plugins: [
  //     'typescript',
  //   ],
  // }
  const ast = parse(source)
  let hasRequires = false

  traverse(ast, {
    MemberExpression (expression) {
      if (expression.node.property.name !== 'origin') return

      const lastArg = _.last(expression.parent.arguments)

      if (lastArg.type !== 'ArrowFunctionExpression') return

      let hasRequire = false

      expression.scope.traverse(lastArg, {
        CallExpression (expression) {
          if (expression.node.callee.name === 'require') {
            hasRequire = true
          }
        },
      }, this)

      if (!hasRequire) return

      hasRequires = true

      const generated = generate(lastArg, {}).code
      const fileName = `origin-cb-${md5(generated)}.js`

      // TODO: this needs to go through webpack before being emitted. figure
      // out how to do that
      // TODO: handle sourcemaps for this correctly
      emitFile(fileName, generated, null, {
        sourceFilename: path.basename(resourcePath),
      })

      expression.parent.arguments[1] = b.objectExpression([
        b.objectProperty(
          b.stringLiteral('callbackFileName'),
          b.stringLiteral(fileName),
        ),
        b.objectProperty(
          b.stringLiteral('callback'),
          b.stringLiteral(generated),
        ),
      ])
    },
  })

  if (hasRequires) {
    // TODO: handle sourcemaps for this correctly.
    // the following causes error "Cannot read property 'replace' of undefined"
    // return generate(ast, { sourceMaps: true }, source).code
    return generate(ast, {}).code
  }

  return source
}

// NOTE: started to write this as a babel plugin, but then it's not in the
// context of webpack for emitting the file. keeping for now in case it ends
// up being relevant
// module.exports = (babel) => {
//   console.log('🟢 inside custom babel loader')

//   function myPlugin () {
//     return {
//       visitor: {},
//     }
//   }

//   return {
//     // Passed the loader options.
//     // customOptions (options) {
//     //   console.log('🟢 customOptions:', options)

//     //   return options
//     // },

//     // Passed Babel's 'PartialConfig' object.
//     config (cfg) {
//       console.log('🟢 config:', cfg)

//       return cfg.options

//       if (cfg.hasFilesystemConfig()) {
//         // Use the normal config
//         return cfg.options
//       }

//       return {
//         ...cfg.options,
//         plugins: [
//           ...(cfg.options.plugins || []),

//           // Include a custom plugin in the options.
//           myPlugin,
//         ],
//       }
//     },

//     result (result) {
//       console.log('🟢 result:', result)

//       return {
//         ...result,
//         code: `${result.code }\n// Generated by my custom loader`,
//       }
//     },
//   }
// }