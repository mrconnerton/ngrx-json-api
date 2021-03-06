import * as _ from 'lodash';

import {
  Headers,
  Http,
  Request,
  RequestOptions,
  Response,
  RequestMethod,
  URLSearchParams
} from '@angular/http';

import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/map';
import 'rxjs/add/observable/throw';

import {
  Document,
  NgrxJsonApiConfig,
  OperationType,
  ResourceDefinition,
  Query,
  QueryParams,
} from './interfaces';
import {
  generateIncludedQueryParams,
  generateFieldsQueryParams,
  generateFilteringQueryParams,
  generateSortingQueryParams,
  generateQueryParams
} from './utils';

export class NgrxJsonApi {

  public headers: Headers = new Headers({
    'Content-Type': 'application/vnd.api+json',
    'Accept': 'application/vnd.api+json'
  });
  public requestUrl: string;
  public definitions = this.config.resourceDefinitions;

  constructor(
    private http: Http,
    public config: NgrxJsonApiConfig
  ) { }

  private urlBuilder(query: Query, operation: OperationType) {
    switch (operation) {
      case 'GET': {
        if (query.type && query.id) {
          return this.resourceUrlFor(query.type, query.id);
        } else if (query.type) {
          return this.collectionUrlFor(query.type);
        }
      }
      case 'DELETE': {
        if (query.type && query.id) {
          return this.resourceUrlFor(query.type, query.id);
        }
      }
      case 'PATCH': {
        if (query.type && query.id) {
          return this.resourceUrlFor(query.type, query.id);
        }
      }
      case 'POST': {
        return this.collectionUrlFor(query.type);
      }
    }

  }

  private collectionPathFor(type: string) {
    // assume that type == collectionPath if not configured otherwise
    let definition = _.find(this.definitions, { type: type });
    if (definition) {
      return `${definition.collectionPath}`;
    } else {
      return type;
    }
  }

  private collectionUrlFor(type: string) {
    let collectionPath = this.collectionPathFor(type);
    return `${this.config.apiUrl}/${collectionPath}`;
  }

  private resourcePathFor(type: string, id: string) {
    let collectionPath = this.collectionPathFor(type);
    return `${collectionPath}/${encodeURIComponent(id)}`;
  }

  private resourceUrlFor(type: string, id: string) {
    let resourcePath = this.resourcePathFor(type, id);
    return `${this.config.apiUrl}/${resourcePath}`;
  }

  public find(query: Query) {

    let _generateIncludedQueryParams = generateIncludedQueryParams;
    let _generateFilteringQueryParams = generateFilteringQueryParams;
    let _generateFieldsQueryParams = generateFieldsQueryParams;
    let _generateSortingQueryParams = generateSortingQueryParams;
    let _generateQueryParams = generateQueryParams;

    if (this.config.hasOwnProperty('urlBuilder')) {
      let urlBuilder = this.config.urlBuilder;

      if (urlBuilder.generateIncludedQueryParams) {
        _generateIncludedQueryParams = urlBuilder.generateIncludedQueryParams;
      }
      if (urlBuilder.generateFilteringQueryParams) {
        _generateFilteringQueryParams = urlBuilder.generateFilteringQueryParams;
      }
      if (urlBuilder.generateFieldsQueryParams) {
        _generateFieldsQueryParams = urlBuilder.generateFieldsQueryParams;
      }
      if (urlBuilder.generateSortingQueryParams) {
        _generateSortingQueryParams = urlBuilder.generateSortingQueryParams;
      }
      if (urlBuilder.generateQueryParams) {
        _generateQueryParams = urlBuilder.generateQueryParams;
      }
    }

    let queryParams = '';
    let includedParam = '';
    let filteringParams = '';
    let sortingParams = '';
    let fieldsParams = '';
    let offsetParams = '';
    let limitParams = '';

    if (typeof query === undefined) {
      return Observable.throw('Query not found');
    }

    if (query.hasOwnProperty('params') && !_.isEmpty(query.params)) {
      if (_.hasIn(query.params, 'include')) {
        includedParam = _generateIncludedQueryParams(query.params.include);
      }
      if (_.hasIn(query.params, 'filtering')) {
        filteringParams = _generateFilteringQueryParams(query.params.filtering);
      }
      if (_.hasIn(query.params, 'sorting')) {
        sortingParams = _generateSortingQueryParams(query.params.sorting);
      }
      if (_.hasIn(query.params, 'fields')) {
        fieldsParams = _generateFieldsQueryParams(query.params.fields);
      }
      if (_.hasIn(query.params, 'limit')) {
        limitParams = 'page[limit]=' + query.params.limit;
      }
      if (_.hasIn(query.params, 'offset')) {
        offsetParams = 'page[offset]=' + query.params.offset;
      }
    }
    queryParams = _generateQueryParams(includedParam, filteringParams, sortingParams,
        fieldsParams, offsetParams, limitParams);

    let requestOptionsArgs = {
      method: RequestMethod.Get,
      url: this.urlBuilder(query, 'GET') + queryParams,
    };

    return this.request(requestOptionsArgs);
  }

  public create(query: Query, document: Document) {

    if (typeof query === undefined) {
      return Observable.throw('Query not found');
    }

    if (typeof document === undefined) {
      return Observable.throw('Data not found');
    }

    let requestOptionsArgs = {
      method: RequestMethod.Post,
      url: this.urlBuilder(query, 'POST'),
      body: JSON.stringify({ data: document.data })
    };

    return this.request(requestOptionsArgs);
  }

  public update(query: Query, document: Document) {

    if (typeof query === undefined) {
      return Observable.throw('Query not found');
    }

    if (typeof document === undefined) {
      return Observable.throw('Data not found');
    }
    let requestOptionsArgs = {
      method: RequestMethod.Patch,
      url: this.urlBuilder(query, 'PATCH'),
      body: JSON.stringify({ data: document.data })
    };

    return this.request(requestOptionsArgs);
  }


  public delete(query: Query) {

    if (typeof query === undefined) {
      return Observable.throw('Query not found');
    }

    let requestOptions = {
      method: RequestMethod.Delete,
      url: this.urlBuilder(query, 'DELETE')
    };

    return this.request(requestOptions);
  }


  private request(requestOptionsArgs) {

    let requestOptions = new RequestOptions(requestOptionsArgs);

    let request = new Request(requestOptions.merge({
      headers: this.headers
    }));

    return this.http.request(request);
  }
}
