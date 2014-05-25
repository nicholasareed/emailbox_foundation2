require.config({

    // baseUrl: 'src/lib',

    // map: {
    //  '*': {
    //      backbone: '../src/lib2/backbone',
    //      underscore: '../src/lib2/underscore',
    //      jquery: '../src/lib2/jquery'
    //  }
    // },
    waitSeconds: 7,
    paths: {
        // appLib: '../src/lib2/',
        // famous: '../lib/famous',
        // requirejs: '../lib/requirejs/require',
        // almond: '../lib/almond/almond',
        // 'famous-polyfills': '../lib/famous-polyfills/index',

        async : '../src/requirejs-plugins/src/async',

        underscore: '../src/lib2/underscore',
        jquery: '../src/lib2/jquery',
        backbone: '../src/lib2/backbone',
        moment: '../src/lib2/moment',
        utils: '../src/lib2/utils',
        api: '../src/lib2/api',
        handlebars: '../src/lib2/handlebars',
        'backbone-adapter' : '../src/lib2/backbone-adapter',
        'jquery-adapter' : '../src/lib2/jquery-adapter'

    },

    shim: {
        'underscore': {
            exports: '_'
        },
        'jquery' : {
            exports: 'jquery',
        },
        'backbone': {
            deps: ['underscore', 'jquery','moment'],
            exports: 'Backbone'
        },
        'backbone-adapter': {
            deps: ['backbone'],
            exports: 'Backbone'
        },
        'jquery-adapter': {
            deps: ['jquery'],
            exports: 'jquery'
        },
        'hammer' : {
            deps: ['jquery'],
            exports: 'Hammer'
        },
        'handlebars' : {
            exports: 'Handlebars'
        },
        'handlebars-adapter' : {
            deps: ['handlebars'],
            exports: 'Handlebars'
        },
        'api' : {
            deps: ['jquery','underscore','utils'],
            exports: ['Api']
        },

        'lib2/leaflet/leaflet.label' : {
            deps: ['lib2/leaflet/leaflet']
        },
        'lib2/leaflet/leaflet.iconlabel' : {
            deps: ['lib2/leaflet/leaflet']
        },
        'lib2/leaflet/tile.stamen' : {
            deps: ['lib2/leaflet/leaflet']
        }

    },

    // urlArgs: new Date().toString(),
    urlArgs: 'v1.7'

});

// Global "App" variable
var App = {};

define(function(require, exports, module) {
    'use strict';

    // import dependencies
    var Engine = require('famous/core/Engine');
    var View = require('famous/core/View');
    var RenderController = require('famous/views/RenderController');
    var Lightbox = require('famous/views/Lightbox');
    var SequentialLayout = require('famous/views/SequentialLayout');
    var Surface = require('famous/core/Surface');
    var ImageSurface = require('famous/surfaces/ImageSurface');
    var InputSurface = require('famous/surfaces/InputSurface');
    var Modifier = require('famous/core/Modifier');
    var Matrix = require('famous/core/Transform');
    var RenderNode = require('famous/core/RenderNode');

    var EventHandler = require('famous/core/EventHandler');

    var Backbone = require('backbone');
    var DeviceReady = require('./device_ready');
    var $ = require('jquery');
    require('lib2/hammer'); // creates global Hammer()
    var _ = require('underscore');
    var Utils = require('utils');
    var Api = require('api');

    // Models
    var PreloadModels = require('models/_preload');
    var UserModel = require('models/user');

    // Config file, symlinked (ln -s) into multiple directories
    var ConfigXml = require('text!config.xml');
    var Credentials = require('text!credentials.json');

    console.info('Loaded main.js');

    // Data store
    App = {
        Credentials: JSON.parse(Credentials),
        MainContext: null,
        MainController: null,
        Events: new EventHandler(),
        Config: null, // parsed in a few lines, symlinked to src/config.xml
        ConfigImportant: {},
        BackboneModels: _.extend({}, Backbone.Events),
        Router: null,
        Views: null,
        Analytics: null,
        Cache: {
            ModelReplacers: {},
            RoutesByHash: {}
        },
        Data: {
            Cache: {
                Patching: {}
            },
            User: null
        },
        Defaults: {
            ScrollView: {
                // friction: 0.0001, // default 0.001
                // edgeGrip: 0.05, // default 0.5
                // speedLimit: 2.5 // default 10
            }
        }
    };

    // Update body stylesheet
    // - remove loading background
    document.body.setAttribute('style',"");

    // Google Analytics Plugin
    Utils.Analytics.init();

    // Parse config.xml and set approprate App variables
    App.Config = $($.parseXML(ConfigXml));
    if(App.Config.find("widget").get(0).attributes.id.value.indexOf('.pub') !== -1){
        App.Prod = true;
        App.ConfigImportant.Version = App.Config.find("widget").get(0).attributes.version.value;
    }

    // Run DeviceReady actions
    // - Push Notifications
    // - Resume, Back, etc.
    App.DeviceReady = DeviceReady;
    App.DeviceReady.init();
    App.DeviceReady.ready.then(function(){
        App.DeviceReady.runGpsUpdate();
    });

    // Router
    App.Router = require('router')(App); // Passing "App" context to Router also

    // Hammer device events, like doubletap
    Hammer($('body').get(0), {
        // swipe_velocity : 0.2
    });

    // create the main context
    App.MainContext = Engine.createContext();
    App.MainContext.setPerspective(1000);

    // Create main Lightbox
    App.MainController = new Lightbox();
    App.MainController.resetOptions = function(){
        this.setOptions(Lightbox.DEFAULT_OPTIONS);
    };

    // // Add Black Background
    // var BlackBackgroundSurface = new Surface({
    //     size: [undefined, undefined],
    //     properties: {
    //         backgroundColor: "black"
    //     }
    // });
    // App.MainContext.add(BlackBackgroundSurface);

    // Add GenericToast
    // - attaches to MainContext at the Root at is an overlay for Toast notifications (more fun animation options than Native Toast)
    // - todo...

    // Add GenericOnlineStatus
    // - we want to effectively communicate to the user when we have lost or are experiencing a degraded internet connection
    // - todo...

    // Add main background image (pattern)
    App.MainContext.add(new Surface({
        size: [undefined, undefined],
        properties: {
            // background: "url(img/mochaGrunge.png) repeat",
            backgroundColor: "white",
            zIndex : -10
        }
    }));

    // Add RenderController to mainContext
    App.MainContext.add(App.MainController);

    // Add ToastController to mainContext
    // - it should be a ViewSequence or something that allows multiple 'toasts' to be displayed at once, with animations)
    // - todo
    var toastNode = new RenderNode();
    App.MainContext.add(toastNode);

    var StartRouter = new App.Router.DefaultRouter();

    console.info('StartRouter');

    // Start history watching
    // - don't initiate based on the first view, always restart
    var initialUrl = false;
    if(1==1){// && window.location.hash.toString() != ''){
        // // Skip goto Home 
        // initialUrl = true;
        // Backbone.history.start();

        // Initiate storage engine
        Utils.Storage.init()
            .then(function(){

                console.log('Loaded Storage.init');

                // Get access_token if it exists
                var oauthParams = Utils.getOAuthParamsInUrl();

                if(typeof oauthParams.access_token == "string"){

                    // Have an access_token
                    // - save it to localStorage
                    Utils.Storage.set(App.Credentials.prefix_access_token + 'user', oauthParams.user_identifier, 'critical');
                    Utils.Storage.set(App.Credentials.prefix_access_token + 'access_token', oauthParams.access_token, 'critical');

                    // Save
                    App.Events.trigger('saveAppDataStore',true);

                    // Reload page, back to #
                    window.location = [location.protocol, '//', location.host, location.pathname].join('');
                    return;
                }

                // Begin at the begining of the application
                // - router_hash: ""
                // with "silent:true" we need to trigger a router to run at some point, otherwise no route is followed by default
                Backbone.history.start({silent: true}); 
                Backbone.history.navigate('',{trigger: false}); // not actually triggering the route, just "reseting"

                // Get user and set to app global
                Utils.Storage.get(App.Credentials.prefix_access_token + 'user', 'critical')
                    .then(function(user){
                        App.Credentials.user = user;
                    });

                // Get access_token, set to app global, login to server (doesn't allow offline access yet)
                // - switch to be agnostic to online state (if logged in, let access offline stored data: need better storage/sync mechanisms)
                Utils.Storage.get(App.Credentials.prefix_access_token + 'access_token', 'critical')
                    .then(function(access_token){

                        console.log('Stored access_token:' + access_token); 

                        // Make available to requests
                        App.Credentials.access_token = access_token;

                        // Run login script from body_login page if not logged in
                        if(typeof App.Credentials.access_token != 'string' || App.Credentials.access_token.length < 1){
                            // App.router.navigate("body_login", true);

                            Backbone.history.navigate('login',{trigger: true})
                            return;
                        }

                        // Validate credentials with mailstats server and emailbox 
                        // - make an api request to load my email address

                        var dfd = $.Deferred();

                        // Logged in on mailstats server
                        App.Data.LoggedIn = true;

                        // Start api listener
                        // socket.io
                        Api.Event.start_listening();

                        // Load login
                        // Api.Event.start_listening();
                        Backbone.history.navigate('dash',{trigger: true})

                    });

        }); // end App.Utils.Storage.init().then...

    } else {
        Backbone.history.start({silent: true}); 
        Backbone.history.navigate('',{trigger: true}); // should go to a "loading" page while we figure out who is logged in
    }



    // // Test login
    // $.ajaxSetup({
    //     cache: false,
    //     statusCode: {
    //         401: function(){
    //             // Redirect the to the login page.
    //             // alert(401);
    //             // window.location.replace('/#login');
             
    //         },
    //         403: function() {
    //             // alert(403);
    //             // 403 -- Access denied
    //             // window.location.replace('/#denied');
    //             App.Data.User.clear();
    //         },
    //         404: function() {
    //             // alert(404);
    //             // 403 -- Access denied
    //             // window.location.replace('/#denied');
    //         },
    //         500: function() {
    //             // alert(500);
    //             // 403 -- Access denied
    //             // window.location.replace('/#denied');
    //         }
    //     }
    // });


    // // Ajax setup for users
    // var localUser = localStorage.getItem('user_v3_');
    // App.Data.User = new UserModel.User();
    // try {

    //     // debugger;
    //     localUser = JSON.parse(localUser);
        
    //     // Set User model to our locally-stored values
    //     App.Data.User.set(localUser);
    //     console.log(App.Data.User);

    //     // Set up ajax credentials for later calls using this user
    //     $.ajaxSetup({
    //         headers: {
    //             'x-token' : localStorage.getItem('usertoken_v1_')
    //         }
    //     });
        
    //     // Redirect after setting ajax credentials
    //     if(localUser && !initialUrl){
    //         // Navigate to my Fleet page
    //         window.setTimeout(function(){
    //             Backbone.history.navigate('fleet',{trigger: true});
    //         }, 100);
    //     }

    //     // Fetch
    //     App.Data.User.fetch({
    //         statusCode: {
    //             403: function(){
    //                 // failed login
    //                 // alert('Failed login on startup');
    //                 console.log(4);
    //                 App.Data.User.clear();

    //                 // Unregister from Push Notifications
    //                 App.DeviceReady.ready.then(function(){
    //                     console.info('Unregisering from PushNotification');
    //                     try {
    //                         window.plugins.pushNotification.unregister();
    //                     }catch(err){
    //                         console.error('Failed unregistering from PushNotification');
    //                     }
    //                 });

    //                 // Logout
    //                 // - if not already at the login page
    //                 // - and if data is already clear
    //                 if(!localUser){
    //                     Backbone.history.navigate('login', {trigger: true});
    //                     return;   
    //                 }

    //                 console.log(window.location.hash);

    //                 if(window.location.hash != '#login' && window.location.hash != '#logout'){
    //                     Backbone.history.navigate('logout', {trigger: true});
    //                 }

    //             }
    //         },
    //         success: function(){
    //             // Resolve deferred (in case anyone is listening)
    //             // Store credentials

    //             // Update localStorage
    //             localStorage.setItem('user_v3_',JSON.stringify(App.Data.User.toJSON()));

    //             // Preload models
    //             PreloadModels(App);

    //         }
    //     });

    // } catch(err){
    //     // Failed badly somewhere
    //     // - log the person out?
    //     console.log('Failed trying to test login');
    //     console.log(err);

    //     // Navigate to Logout
    //     Backbone.history.navigate('logout', {trigger: true});
    //     // return;

    //     // alert('Unable to log in');
    //     // debugger;

    // }


});
