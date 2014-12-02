define(function (require) {

    "use strict";

    var $                   = require('jquery'),
        Backbone            = require('backbone-adapter'),
        moment            = require('moment'),
        Credentials         = JSON.parse(require('text!credentials.json')),

        ContestContent = Backbone.DeepModel.extend({

            idAttribute: '_id',

            urlRoot: Credentials.server_root + "contest_content/",

            initialize: function () {
                // ok
                if(this.id){
                  this.url = this.urlRoot + this.id;
                } else {
                  this.url = this.urlRoot;
                }
            }

        });

    ContestContent = Backbone.UniqueModel(ContestContent);

    var ContestContentCollection = Backbone.Paginator.requestPager.extend({

            model: ContestContent,

            // url: Credentials.server_root + "contest_contents/by_players",
            urlRoot: Credentials.server_root + "contest_contents/",

            // Paginator Core
            paginator_core: {
              // the type of the request (GET by default)
              type: 'GET',

              // the type of reply (jsonp by default)
              dataType: 'json',

              // the URL (or base URL) for the service
              // if you want to have a more dynamic URL, you can make this a function
              // that returns a string
              url: function(){return this.url}
            },

            // Paginator User Interface (UI)
            paginator_ui: {
              // the lowest page index your API allows to be accessed
              firstPage: 0,

              // which page should the paginator start from
              // (also, the actual page the paginator is on)
              currentPage: 0,

              // how many items per page should be shown
              perPage: 10,
              totalPages: 10 // the default, gets overwritten
            },

            // Paginator Server API
            timeframe: 'all', // top, local
            server_api: {

              'type' : function(){
                return this.type;
              },

              // the query field in the request
              '$filter': function(){
                var f = {};
                // if(this.sport_id !== 'all'){
                //   f.sport_id = this.sport_id;
                // }
                if(this.timeframe !== 'all'){
                  f.created = {
                      '$gte' : this.timeframe
                    }
                }
                return JSON.stringify(f);
              },

              // number of items to return per request/page
              '$top': function() { return this.perPage },

              // how many results the request should skip ahead to
              // customize as needed. For the Netflix API, skipping ahead based on
              // page * number of results per page was necessary.
              '$skip': function() { return this.currentPage * this.perPage },

              // // field to sort by
              // '$orderby': 'ReleaseYear',

              // what format would you like to request results in?
              '$format': 'json',

              // custom parameters
              '$inlinecount': 'allpages',
              // '$callback': 'callback'
            },

            // Paginator Parsing
            parse: function (response) {
                this.totalPages = Math.ceil(response.total / this.perPage);
                this.totalResults = response.total;
                this.summary = response.summary;

                // console.log('SUMMARY', this.summary);
                // console.log(JSON.stringify(this.summary));
                
                // debugger;
                return response.results;
            },


            initialize: function(models, options){
                options = options || {};
                this.options = options;
                this.url = this.urlRoot + '';

                // if(options.type){
                //   this.type = options.type;
                // }

                if(options.contest_id){
                  this.url = this.urlRoot + options.contest_id;
                }

                // if(options.timeframe){
                //   this.timeframe = options.timeframe;
                // }
            },

            comparator: function(model){
                return -1 * moment(model.get('created'), "YYYYMMDD HHmmss"); // 20131106T230554+0000
            },

            findByLastContestContent: function(){
                var deferred = $.Deferred();
                
                deferred.resolve(this.first());
                
                return deferred.promise();
            }

        });

    return {
        ContestContent: ContestContent,
        ContestContentCollection: ContestContentCollection
    };

});