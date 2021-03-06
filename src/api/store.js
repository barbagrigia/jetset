import { fromJS, Map, List } from 'immutable';

import { getIdFromModel } from '../lib/schema';
import stateTree from '../store';

/* basic state tree layout
* {
*   $api: {
*     [url]: {
*       [resource]: {
*         models: {
*           [id]: {
*             [key]: any,
*             _fetched?: boolean
*           }
*         },
*         requests: {
*           [url]: {
*             pending?: boolean,
*             error?: Object,
*             data?: List | Map
*           }
*         }
*       }
*     }
*   }
* }
*/

export default function initApiStore( url, schema, store = stateTree ) {

  const resourceType = schema.title;
  const rootPath = [ '$api', url, resourceType ];

  const methods = {

    // core

    _getState: store.getState,

    getState: key =>
      store.getState( rootPath.concat( key || [] ).map( item => String( item ) ) ),

    setState: ( val, key ) =>
      store.setState( rootPath.concat( key || [] ).map( item => String( item ) ), val ),

    setStateQuiet: ( val, key ) =>
      store.setStateQuiet( rootPath.concat( key || [] ), val ),

    // requests

    requestsPath: path => [ 'requests' ].concat( path || [] ),

    getRequests: path =>
      methods.getState( methods.requestsPath( path ) ),

    getRequestsData: path =>
      methods.getRequests([ path, 'data' ]),

    getRequestsFormat: path =>
      methods.getRequests([ path, 'format' ]),

    setRequests: ( data, path ) =>
      methods.setState( data, methods.requestsPath( path ) ),

    setRequestsData: ( path, data ) =>
      methods.setRequests( data, [ path, 'data' ] ),

    setRequestsFromat: ( path, data ) =>
      methods.setRequests( data, [ path, 'format' ] ),

    getPending: path =>
      methods.getRequests([ path, 'pending' ]),

    setPending: ( path, data ) =>
      methods.setStateQuiet( data, methods.requestsPath([ path, 'pending' ]) ),

    getError: path =>
      methods.getRequests([ path, 'error' ]),

    setError: ( path, error, options = {} ) => {
      const method = options.quiet ? methods.setStateQuiet : methods.setState;
      method( error, methods.requestsPath([ path, 'error' ]) );
    },

    // models

    getModels: () =>
      methods.getState( 'models' ) || Map(),

    setModels: data =>
      methods.setState( data, 'models' ),

    getModel: id =>
      methods.getState([ 'models', id ]),

    setModel: ( id, data ) =>
      methods.setState( data, [ 'models', id ] ),

    deleteModel: id => {
      const undo = [];
      const idStr = String( id );
      methods.setState(
        ( methods.getState() || Map() ).withMutations( map => {
          const model = methods.getModel( idStr );
          if ( model ) {
            map.update( 'models', ( models = Map() ) => models.delete( idStr ) );
            undo.push(() => methods.setModels( methods.getModels().set( idStr, model ) ));
            undo.push( ...methods.removeFromCollections( map, idStr ) );
          }
        })
      );
      return undo;
    },

    updateModel: ( id, vals ) => {
      const undo = [];
      const model = methods.getModel( id );
      if ( model ) {
        methods.setModel( id, model.mergeDeep( vals ) );
        undo.push(() => methods.setModels( methods.getModels().set( id, model ) ) );
      }
      return undo;
    },

    // collections (lists hydrated with models)

    getCollection: ( path = `/${resourceType}` ) => {
      const collection = methods.getRequestsData( path );
      if ( collection ) {
        if ( methods.getRequestsFormat( path ) === 'string' ) {
          return collection;
        } else {
          const models = methods.getModels();
          return collection.map( id => models.get( id ) || Map() );
        }
      } else {
        return null;
      }
    },

    setCollection: ( data = List(), path = `/${resourceType}` ) => {
      methods.setState(
        ( methods.getState() || Map() ).withMutations( map => {
          if ( data.length && typeof data[0] !== 'object' ) {
            map.setIn( methods.requestsPath([ path, 'data' ]), List( data ) );
            map.setIn( methods.requestsPath([ path, 'format' ]), 'string' );
          } else {
            const dict = data.reduce(( memo, item ) => ({ ...memo, [getIdFromModel( item )]: item }), {});
            const collection = List( Object.keys( dict ) );
            map.update( 'models', ( models = Map() ) => models.mergeDeep( dict ) );
            map.setIn( methods.requestsPath([ path, 'data' ]), collection );
          }
        })
      );
      return methods.getCollection( path );
    },

    updateCollection: ( model, path = `/${resourceType}` ) => {
      const id = String( getIdFromModel( model ) );
      methods.setState(
        ( methods.getState() || Map() ).withMutations( map => {
          map.update( 'models', ( models = Map() ) => models.mergeDeep( fromJS({ [id]: model }) ) );
          map.updateIn( methods.requestsPath([ path, 'data' ]), ( data = List() ) => data.push( id ));
        })
      );
    },

    clearCollection: ( path = `/${resourceType}` ) => 
      methods.setRequests( Map(), path ),

    removeFromCollections: ( map, id ) =>
      [ ...( map.getIn( methods.requestsPath() ) || Map() ).entries() ]
        .reduce(( undo, [path, request] ) => {
          const collection = request.get( 'data' );
          if ( List.isList( collection ) ) {
            const modelIdx = collection.findIndex( modelId => modelId === id );
            if ( ~modelIdx ) {
              const nextCollection = collection.delete( modelIdx );
              map.setIn( methods.requestsPath([ path, 'data' ]), nextCollection );
              undo.push(() => methods.setRequestsData( path, nextCollection.insert( modelIdx, id ) ) );
            }
          }
          return undo;
        }, []),

    clearAll: () => {
      methods.setRequests( Map() );
      methods.setModels( Map() );
    },

    subscribePath: rootPath
  };

  return methods;
}
