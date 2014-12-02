/*globals define*/
define(function(require, exports, module) {
    
    var Engine = require('famous/core/Engine');
    var View = require('famous/core/View');
    var SequentialLayout = require('famous/views/SequentialLayout');
    var Surface = require('famous/core/Surface');
    var InputSurface = require('famous/surfaces/InputSurface');
    var Modifier = require('famous/core/Modifier');
    var StateModifier = require('famous/modifiers/StateModifier');
    var Matrix = require('famous/core/Transform');
    var Transform = require('famous/core/Transform');

    var Utility = require('famous/utilities/Utility');
    var EventHandler = require('famous/core/EventHandler');

    var Backbone = require('backbone');

    var Utils = require('utils');

    // Models
    var UserModel = require('models/user');

    function PageView(options) {
        // initialize, setup the Surfaces (and subviews?)
        var that = this;
        View.apply(this, arguments);
        this.options = options;

        // Add background
        var bgSurface = new Surface({
            size: [undefined, undefined],
            classes: ['bg-surface'],
            properties: {
                background : "#eee",
                zIndex : "-1"
            }
        });
        this.add(Transform.behind).add(bgSurface);

        // create the layout
        this.layout = new SequentialLayout();

        // Build Surfaces
        var surfaces = [];

        this.boxSurface = new Surface({
            size: [200,40],
            classes: ['button-surface'],
            content: 'Auth w/ Emailbox',
            properties: {
                lineHeight : "20px"
            }
        });

        surfaces.push(this.boxSurface);

        this.boxSurface.on('click', this.login.bind(this));

        this.layout.sequenceFrom(surfaces);

        var originMod = new StateModifier({
            origin: [0.5, 0.5]
        });

        // assign the layout to this view
        // - with a SizeModifier so that we can center everything

        this.add(new Modifier({ size: [undefined,undefined] })).add(originMod).add(this.layout);

        // // Model
        // this.model = new UserModel.User();

    }

    PageView.prototype = Object.create(View.prototype);
    PageView.prototype.constructor = PageView;

    PageView.prototype.login = function(){

        // Start OAuth process
        var that = this;

        var p = {
            app_id : App.Credentials.app_key,
            callback : [location.protocol, '//', location.host, location.pathname].join('')
        };
        
        if(App.Data.usePg){
            
            var p = {
                response_type: 'token', // token = "#", code = "?"
                client_id : App.Credentials.app_key,
                redirect_uri : 'https://getemailbox.com/testback'
            };
            var params = $.param(p);
            var call_url = App.Credentials.base_login_url + "/apps/authorize/?" + params;

            var ref = window.open(call_url, '_blank', 'location=yes');
            ref.addEventListener('loadstart', function(event) { 
                // event.url;
                var tmp_url = event.url;

                var parser = document.createElement('a');
                parser.href = tmp_url;

                if(parser.hostname == 'getemailbox.com' && parser.pathname.substr(0,9) == '/testback'){
                    
                    // window.plugins.childBrowser.close();
                    // alert('closing childbrowser after /testback');
                    // return false;
                    // alert('testback');

                    // url-decode
                    // alert(tmp_url);
                    var url = decodeURIComponent(tmp_url);
                    // alert(url);

                    // var qs = App.Utils.getUrlVars();
                    var oauthParams = Utils.getOAuthParamsInUrl(url);
                    // alert(JSON.stringify(oauthParams));

                    // if(typeof qs.user_token == "string"){
                    if(typeof oauthParams.access_token == "string"){

                        // Have an access_token
                        // - save it to localStorage

                        // App.Utils.Storage.set(App.Credentials.prefix_access_token + 'user', oauthParams.user_identifier);
                        // App.Utils.Storage.set(App.Credentials.prefix_access_token + 'access_token', oauthParams.access_token);

                        Utils.Storage.set(App.Credentials.prefix_access_token + 'user', oauthParams.user_identifier, 'critical')
                            .then(function(){
                                // Saved user!
                                // alert('saved user');
                            });

                        Utils.Storage.set(App.Credentials.prefix_access_token + 'access_token', oauthParams.access_token, 'critical')
                            .then(function(){
                                
                                // Reload page, back to #home
                                // forge.logging.info('reloading');

                                // alert('success');
                                // window.plugins.childBrowser.close();

                                // Emit save event (write file)
                                App.Events.trigger('FileSave',true);
                                ref.close();


                                // // Reload page, back to #home
                                // window.location = [location.protocol, '//', location.host, location.pathname].join('');
                                $('body').html('Loading');

                                // Reload page, back to #home
                                window.setTimeout(function(){
                                    window.location = [location.protocol, '//', location.host, location.pathname].join('');
                                },500);
                            });

                    } else {
                        // Show login splash screen
                        var page = new App.Views.BodyLogin();
                        App.router.showView('bodylogin',page);

                        alert('Problem logging in');
                        // window.plugins.childBrowser.close();
                        ref.close();

                    }

                    return;

                }

                return;

            });
            // ref.addEventListener('loadstop', function(event) { alert('stop: ' + event.url); });
            // ref.addEventListener('loaderror', function(event) { console.error('Uh Oh, encountered an error: ' + event.message); });
            // ref.addEventListener('exit', function(event) { alert('exit1');alert(event.type); });

        } else {

            var p = {
                response_type: 'token',
                client_id : App.Credentials.app_key,
                redirect_uri : [location.protocol, '//', location.host, location.pathname].join('')
            };
            var params = $.param(p);
            window.location = App.Credentials.base_login_url + "/apps/authorize/?" + params;

        }

        return false;


    };

    PageView.DEFAULT_OPTIONS = {
    };

    module.exports = PageView;


});
