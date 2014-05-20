define(function (require) {

    "use strict";

    var $                   = require('jquery-adapter'),
        Backbone            = require('backbone-adapter'),
        Api                 = require('api'),
        // ModelThread         = require('app/models/thread'),

        Email = Backbone.DeepModel.extend({

            idAttribute: '_id',
            modelName: 'Email',
            url: App.Credentials.base_api_url,

            sync: Backbone.Model.emailbox_sync,

            initialize: function () {
                
            }

        }),

        EmailCollection = Backbone.Collection.extend({

            model: Email,
            url: App.Credentials.base_api_url,

            search_conditions: {},

            sync: Backbone.Collection.emailbox_sync,
            comparator: function(model1, model2){
                var m1 = moment(model1.attributes.common.date),
                    m2 = moment(model2.attributes.common.date);
                if(m1 > m2){
                    return -1;
                }
                if(m1 == m2){
                    return 0;
                }
                return 1;
            },

            comparator_reverse: function(model1, model2){
                var m1 = moment(model1.attributes.common.date),
                    m2 = moment(model2.attributes.common.date);
                if(m1 > m2){
                    return 1;
                }
                if(m1 == m2){
                    return 0;
                }
                return -1;
            },

            initialize: function(models, options){
                options = options || {};
                this.options = options;
                
                if(options.type == 'thread'){
                    var key = 'attributes.thread_id';
                    this.search_conditions[key] = options.thread_id;
                }

            },
            

            _countSentVal: 0,
            countSent: function(){
                var that = this;
                return Api.count({
                    data: {
                        model: 'Email',
                        conditions: {
                            'original.labels' : '\\\\Sent',
                            'common.date_sec' : {
                                '$gte' : moment().startOf('day').unix()
                            }
                        }
                    },
                    success: function(response, code, data, msg){
                        that._countSentVal = data;
                        that.trigger('update:CountSent');
                    }

                });
            },
            _countReceivedVal: 0,
            countReceived: function(){
                var that = this;
                return Api.count({
                    data: {
                        model: 'Email',
                        conditions: {
                            'original.labels' : {
                                '$ne' : '\\\\Sent'
                            },
                            'common.date_sec' : {
                                '$gte' : moment().startOf('day').unix()
                            }
                        }
                    },
                    success: function(response, code, data, msg){
                        that._countReceivedVal = data;
                        that.trigger('update:CountReceived');
                    }

                });
            }

        });

    return {
        Email: Email,
        EmailCollection: EmailCollection
    };

});