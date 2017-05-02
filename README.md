# Jetset
> Multi-faceted library of tools built around an immutable state tree

NOTE: This is very much a work in progress. Everything subject to change!

## Install

```
$ npm i --save DigitalGlobe/jetset
```

## Use


See below for different tools/libs available. Note that all state is stored in
an [Immutable](https://github.com/facebook/immutable-js/) state tree, so you'll
want to become familiar with its [api and data structures](http://facebook.github.io/immutable-js/docs/#/), especially [Map](http://facebook.github.io/immutable-js/docs/#/Map) and [List](http://facebook.github.io/immutable-js/docs/#/List), which we are using in the state tree instead of objects and arrays.

### Api
> Jetset the fetching, state management, and rendering of your api data!

1. Setup

    Create a [json schema](http://json-schema.org/) to match your REST resource.
    Here is an example of a bare-minimum schema to set up everything for /sources:

    ```json
     {
       "$schema": "http://json-schema.org/draft-04/schema#",
       "title": "sources",
       "properties": {
         "_id": { "type": "string" }
       }
     }
    ```

    More complex functionality, for example related data features, will require
    more complex schemas (coming soon).

1. Quick start (using sources example from above)

    ```javascript
    import Api from 'jetset/api';

    function MyComponent({ sources }) {
      return (
        <div>
          { sources().map( item => (
            <div>
              <span>{ item.get( 'title' ) }</span>
              <button onClick={() => item.$update({ title: 'renamed' }) }>Rename</button>
              <button onClick={ item.$delete }>Delete</button>
            </div>
          ))}
          <button onClick={ sources.$create({ title: 'foo' }) }>Create new item</button>
        </div>
      );
    }

    function MyApi() {
      return (
        <Api url="https://somehost.com/api" sources={ sourcesSchema }>
          <MyComponent />
        </Api>
      );
    }
    ```

#### Reference

```javascript
const { sources } = props; // e.g. from <Api url="..." sources={ sourcesSchema } />

// GET /sources => List (will use cache)
sources()

// POST /sources => Promise<Array>
sources.$create({...})

// GET /sources?key=val... => Promise<Array>
sources.$search({ key: val, ...})
sources.$search.results({ key: val,... }) // List (will use cache)

// GET /sources/id => Map (will use cache)
sources.$get( id )

// PUT /sources/id => Promise<Object>
sources.$get( id ).$update({...})
sources().find( model => model.get( '_id' ) === id ).$update({...})

// DELETE /sources/id => Promise<Object>
sources.$get( id ).$delete( id )
sources().find( model => model.get( '_id' ) === id ).$delete()

// GET /sources/some/other/route => Promise<Array|Object>
sources.api.get( '/some/other/route' )

// GET /sources/some/other/route => List|Map (will use cache)
sources.api.$get( '/some/other/route' )

// POST /sources/some/other/route => Promise<Array|Object>
sources.api.post( '/some/other/route' )

// check if underlying request is pending => boolean|void
sources().$isPending
sources.$get( id ).$isPending

// check if request got an error => Error|void
sources().$error
sources.$get( id ).$error

// clear cache => void
sources.$clear();
sources.$get( id ).$clear()
sources.$search.results({...}).$clear()

// reset with data from server => void
sources.$reset();
sources.$get( id ).$reset()
sources.$search.results({...}).$reset()
```
#### Optimism and pessimism

By default, deletes and updates are optimistic. To turn this off, pass
`{ optimistic: false }` in as an option. For example:

```javascript
sources.$get( id ).$delete({ optimistic: false })
sources.$get( id ).$update({ title: 'foo' }, { optimistic: false })
```

There is experimental support for optimistic creates. In this case, pass
a function in as the value of `optimistic`. This function will receive as
arguments the current state and the data payload you are about to post. For
example:

```javascript
sources.$create({ title: 'foo' }, { optimistic: ( state, data ) => {
  state.setIn([ 'models', 'fooId' ], Map({ ...data, _id: 'fooId' }));
}})
```


## Examples

Note: Examples currently assume timbr-omni is running with the api-lib-poc branch checked out.

1. Clone this repo

1. `npm i`

1. `npm start`

1. Go to http://localhost:8080 (or whatever port you can see assigned in the console)

Source code is available in src/examples.
