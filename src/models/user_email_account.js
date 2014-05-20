define(function (require) {

    "use strict";

    var $                   = require('jquery'),
        Backbone            = require('backbone-adapter'),
        Credentials         = JSON.parse(require('text!credentials.json')),

        UserEmailAccount = Backbone.DeepModel.extend({

            idAttribute: '_id',
            sync: Backbone.Model.emailbox_sync,

            initialize: function () {
            }

        }),

        UserEmailAccountCollection = Backbone.Collection.extend({

            model: UserEmailAccount,

            initialize: function(models, options){
                options = options || {};
                this.options = options;
                if(options._id){
                    this.url = this.url + '/'+options.modelType+'/' + options._id;
                }
            }

        });

    return {
        UserEmailAccount: UserEmailAccount,
        UserEmailAccountCollection: UserEmailAccountCollection
    };

});