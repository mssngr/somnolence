import somnolence from '@somnolence/client'

somnolence.__root().then(response => console.log(response.body))

somnolence
  .helloGET({ query: { name: 'world' } })
  .then(response => console.log(response.body))

somnolence.authorized().then(response => console.log(response.body))
