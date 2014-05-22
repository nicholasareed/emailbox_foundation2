/*globals define*/
define(function(require, exports, module) {
    
    var Lightbox          = require('famous/views/Lightbox');
    var Transform       = require('famous/core/Transform');
    var Easing          = require('famous/transitions/Easing');

    var SpringTransition = require('famous/transitions/SpringTransition');
    var Transitionable   = require('famous/transitions/Transitionable');
    Transitionable.registerMethod('spring', SpringTransition);

    var Utils = require('utils');

    module.exports = function(App){

        var stateHistory = [];

        var DefaultRouter = Backbone.Router.extend({

            routes: {
                '' : function(){
                    console.info('homeAlso');
                },

                'login' : function(){
                    // eh, I should be able to cache this route before login, then destroy after login
                    defaultRoute('Login', 'Misc/Login', arguments, {cache: false});
                },

                'logout' : function(){

                    // Clear storage
                    localStorage.clear();

                    // Unregister from Push Notifications
                    // - do this before exiting
                    App.DeviceReady.ready.then(function(){


                        // Clear User
                        try {
                            App.Data.User.clear();
                        }catch(err){
                        }

                        // Unregister from Push
                        console.info('Unregisering from PushNotification');
                        try {
                            window.plugins.pushNotification.unregister();
                        }catch(err){
                            console.error('Failed unregistering from PushNotification');
                        }

                        // Reset credentials
                        $.ajaxSetup({
                            headers: {
                                'x-token' : ''
                            }
                        });

                        // // Try and exit on logout, because we cannot effectively clear views
                        // try {
                        //     navigator.app.exitApp();
                        // } catch(err){
                        // }

                        // try {
                        //     navigator.device.exitApp();
                        // } catch(err){
                        // }

                        // Last effort, reload the page
                        // - probably lose all native hooks
                        // console.log(window.location.href);
                        window.location = window.location.href.split('#')[0] + '#login';

                        return;
                    });

                },
                'settings': function(){
                    defaultRoute('Settings', 'Misc/Settings', arguments);
                },

                'dash' : function(){
                    defaultRoute('Dash', 'Misc/Dash', arguments);
                },

                'thread/:id' : function(){
                    defaultRoute('Thread', 'Misc/Thread', arguments);
                },

            }
        });

        var defaultRoute = function(viewName, viewPath, args, options){
            // Get view based on hash fragment
            // - return cached item

            // Utils.Analytics.trackRoute(window.location.hash);

            options = options ? options : {};
            if(args === undefined){
                args = viewPath;
                viewPath = viewName;
            }

            console.log('viewPath:', viewPath);

            // Require at runtime
            require(['views/' + viewPath], function(LoadedView){
    
                // Used for a 350ms delay if we are just loading the new View for the first time
                var delayShowing = 0;
                
                var PageView = App.Router.Cache.get();

                if(PageView === false || options.cache === false){
                    // create it! 
                    // - first time creating it
                    PageView = new LoadedView({
                        args: args,
                        App: App
                    });

                    // Pipe events through to View?
                    // this.headerView.pipe(this._eventInput);
                    // this._eventInput.on('menuToggle', this.menuToggle.bind(this))

                    // Cache it
                    App.Router.Cache.set(PageView);

                    delayShowing = 100;
                }

                // Switch to it
                // - if going backwards, do something interesting?
                // - maybe a View could define if it is going to a View of type "car" then it would do a different animation?
                // console.log(PageView);
                // console.log(PageView.inTransform);
                // console.log(PageView.outTransform);

                // Set lightbox back to it's defaults
                // - specifically, the curve fucked stuff up!
                App.MainController.resetOptions();
                var transitionOptions = {};

                var StoredTransitions = {

                    Identity: {
                        inOpacity: 1,
                        outOpacity: 1,
                        inTransform: Transform.identity,
                        outTransform: Transform.identity,
                        inTransition: { duration: 2400, curve: Easing.easeIn },
                        outTransition: { duration: 2400, curve: Easing.easeIn },
                    },

                    OpacityIn: {
                        inOpacity: 0,
                        outOpacity: 0,
                        inTransform: Transform.identity,
                        outTransform: Transform.identity,
                        inTransition: { duration: 750, curve: Easing.easeIn },
                        outTransition: { duration: 750, curve: Easing.easeOut }
                    },

                    HideOutgoingSpringIn: {
                        inOpacity: 0,
                        outOpacity: 0,
                        inTransform: Transform.scale(0,-0.1, 0), //Transform.translate(window.innerWidth,0,0),
                        outTransform: Transform.translate(0, 0, 1),
                        inTransition: { method: 'spring', period: 500, dampingRatio: 0.5 },
                        outTransition: { duration: 300, curve: Easing.easeOut }
                    },

                    SlideDown: {
                        inOpacity: 1,
                        outOpacity: 1,
                        inTransform: Transform.identity, //Transform.translate(0,window.innerHeight * -1,0),
                        outTransform: Transform.translate(0,window.innerHeight,0),
                        inTransition: { duration: 750},
                        outTransition: { duration: 750},
                        overlap: true
                    },

                    SlideUp: {
                        inOpacity: 1,
                        outOpacity: 1,
                        inTransform: Transform.translate(0,window.innerHeight,0),
                        outTransform: Transform.identity, //Transform.translate(0,window.innerHeight * -1,0),
                        inTransition: { duration: 750},
                        outTransition: { duration: 750},
                        overlap: true
                    },

                    SlideLeft: {
                        inOpacity: 1,
                        outOpacity: 1,
                        inTransform: Transform.translate(window.innerWidth,0,0),
                        outTransform: Transform.translate(window.innerWidth * -1,0,0),
                        inTransition: { duration: 500, curve: Easing.easeIn },
                        outTransition: { duration: 500, curve: Easing.easeIn },
                        overlap: true
                    },

                    SlideRight: {
                        inOpacity: 1,
                        outOpacity: 1,
                        inTransform: Transform.translate(window.innerWidth * -1,0,0),
                        outTransform: Transform.translate(window.innerWidth,0,0),
                        inTransition: { duration: 500, curve: Easing.easeIn },
                        outTransition: { duration: 500, curve: Easing.easeIn },
                        overlap: true
                    }
                };

                // Setting using default options
                console.log('Animating using Default SlideLeft');
                transitionOptions = StoredTransitions.SlideLeft;

                // See if we're going back a page
                // - use a Default "back" animation SlideRight
                var goingBack = false;
                var l = stateHistory.length,
                    state = window.location.hash;
                if (l > 1){
                    // stateHistory.push(window.location.hash);
                    console.log(state, ':', stateHistory[l-2]);
                    if (state === stateHistory[l - 2]) {
                        // returning to the previous page actually (so use a "back" animation)
                        stateHistory.pop();
                        console.log('Animating using BACK');
                        // App.MainController.resetOptions();
                        transitionOptions = StoredTransitions.SlideRight;
                        goingBack = true;
                    } else {
                        stateHistory.push(state);
                    }
                } else {
                    stateHistory.push(state);
                }
                
                
                // Handle special transitions if the View->View conditions match
                var ViewToView = {

                    // Potentially request data from the PageView here, or tell it how to render in/out
                    // - we might simply emit events like "Hey, you're about to get shown" and "here is how long you have to do stuff before you're removed via the Lightbox"

                    // specific: View-View
                    // mid: X -> *
                    // low: * -> X

                    '* -> Login' : function(){
                        return StoredTransitions.OpacityIn;
                    },

                    'Login -> *' : function(){
                        return StoredTransitions.SlideDown;
                    },
                };

                App.Cache.LastViewName = App.Cache.LastViewName === undefined ? "" : App.Cache.LastViewName;
                var exactMatchView = App.Cache.LastViewName + ' -> ' + viewName, // highest priority
                    toAnyView = App.Cache.LastViewName + ' -> *', 
                    fromAnyView = '* -> ' + viewName; // lowest priority

                // Extract out multiple key values
                // - todo, would allow: "* -> Login, Home -> Login" for the occurrences
                // - could also add an "!important" flag?

                // Check broastest->specific ViewToView transitions
                if(ViewToView[exactMatchView]){
                    // Most specific match
                    console.log('ViewToView Match: Specific:', exactMatchView);
                    // App.MainController.resetOptions();
                    transitionOptions = ViewToView[exactMatchView]();
                } else if(ViewToView[toAnyView]){
                    // mid
                    console.log('ViewToView Match: ToAny:', toAnyView);
                    // App.MainController.resetOptions();
                    transitionOptions = ViewToView[toAnyView]();
                } else if(ViewToView[fromAnyView]){
                    // low
                    console.log('ViewToView Match: FromAny:', fromAnyView);
                    // App.MainController.resetOptions();
                    transitionOptions = ViewToView[fromAnyView]();
                }

                // Lastly, send the selected "options" to the incoming and outgoing views
                // - each View should receive

                // takes in the direction it is going (in/out) and returns an options to set (which we compare against)
                // - views are assuming that we're doing a "show" immediately following this, no promises
                // - also serves as a trigger for the view that they are doing something

                // todo:
                // - FIX TO INCLUDE THE DELAY!!!

                // tell "hiding" first (dunno why)
                if(App.MainController.lastView && App.MainController.lastView.inOutTransition){
                    transitionOptions = App.MainController.lastView.inOutTransition('hiding', viewName, transitionOptions, delayShowing, PageView, goingBack);
                    console.log(transitionOptions);
                    // debugger;
                }
                // tell "showing" next
                if(PageView.inOutTransition){
                    transitionOptions = PageView.inOutTransition('showing', App.Cache.LastViewName, transitionOptions, delayShowing, App.MainController.lastView, goingBack);
                }

                App.MainController.resetOptions();
                App.MainController.setOptions(transitionOptions);

                // Lightbox now shows the correct PageView
                // - setOptions already called, potentially multiple times!
                App.MainController.lastView = PageView;

                // Delay displaying for a moment, if we just created this View for the first time
                // - expecting it to need a second to load, or something
                window.setTimeout(function(){
                    App.MainController.show(PageView);
                }, delayShowing);   
                console.log(delayShowing);

                // Update LastViewName
                App.Cache.LastViewName = '' + viewName;

            });

        };

        return {

            DefaultRouter: DefaultRouter,

            Cache : {
                get: function(options){
                    var hash = window.location.hash;
                        // current_view = App.Cache.Routes[hash]; 

                    options = options || {}; // better way to do this is (options || options = {}) or similar
                    // options = $.extend({
                    //     render: true
                    // }, options);

                    // Cached View?
                    if(App.Cache.RoutesByHash[hash] != undefined){
                        return App.Cache.RoutesByHash[hash];
                    }

                    return false;
                },
                set: function(view){// Returns a cached view for this route
                    var hash = window.location.hash;
                    App.Cache.RoutesByHash[hash] = view;
                    // view.isCachedView = true;
                    return view;
                }
            }

        };

    };

});
