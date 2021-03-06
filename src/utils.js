define(function (require) {

    "use strict";

    var $ = require('jquery-adapter'),
        _ = require('underscore');

    var Modifier = require('famous/core/Modifier');
    var ImageSurface = require('famous/surfaces/ImageSurface');

    var Transform = require('famous/core/Transform');
    var StateModifier = require('famous/modifiers/StateModifier');

    var Credentials = JSON.parse(require('text!credentials.json'));
    var Crypto = require('lib2/crypto');

    var Help = require('help');
    // var thisHelp = new Help();

    var tinycolor = require('lib2/tinycolor');

    var Utils = {

        CheckFlag: function(flag){
            // returns promise
            // debugger;
            var def = $.Deferred()
            App.Data.User.populated().then(function(){
                if(App.Data.User.get('flags.' + flag)){
                    // def.resolve(true);
                    def.reject();
                    // def.resolve(true);
                } else {
                    // alert('rejected');
                    // console.log(App.Data.User.toJSON());
                    // console.log(App.Data.User.get('flags.' + flag));
                    // debugger;
                    // def.reject();
                    def.resolve(true);
                }
            });
            return def.promise();
        },
        PostFlag: function(flag, value){
            // value is always going to be true, we are tripping a flag
            var tmpData = {
                flags: {}
            };
            tmpData.flags[flag] = value;
            App.Data.User.set('flags.' + flag, value);
            return $.ajax({
                url: Credentials.server_root + 'user/flag',
                method: 'PATCH',
                data: tmpData,
                error: function(){
                    Utils.Notification.Toast('Failed Flag');
                    console.error('Failed Flag:',flag);
                    // debugger;
                },
                success: function(){
                    // awesome
                }
            });
        },

        QuickModel: function(ModelName, id, model_file){
            if(model_file == undefined){
                model_file = ModelName.toLowerCase();
            }

            var defer = $.Deferred();

            require(['models/' + model_file], function(Model){

                if(!id || id.length < 1){
                    defer.reject();
                    return;
                }

                var newModel = new Model[ModelName]({
                    _id: id
                });
                if(newModel.hasFetched){
                    // Already fetched
                    defer.resolve(newModel);
                } else {
                    newModel.populated().then(function(){
                        defer.resolve(newModel);
                    });
                    if(App.Cache['QuickModel_' + ModelName + '_' + id] !== true){
                        // Need to initiate a fetch
                        // console.log(newModel.isFetching, newModel.hasFetched, newModel.toJSON());
                        App.Cache['QuickModel_' + ModelName + '_' + id] = true;
                        newModel.fetch({prefill: true});
                    }
                }
            });

            return defer.promise();

        },

        // QuickModel: {
        //     Player: function(id){

        //         var defer = $.Deferred();

        //         require(['models/player'], function(Model){

        //             if(!id || id.length < 1){
        //                 defer.reject();
        //                 return;
        //             }

        //             var newModel = new Model.Player({
        //                 _id: id
        //             });
        //             if(newModel.hasFetched){
        //                 // Already fetched?
        //                 // console.log(1);
        //                 defer.resolve(newModel);
        //             } else {
        //                 // console.log(2);
        //                 newModel.fetch({prefill: true});
        //                 newModel.populated().then(function(){
        //                     // console.log(newModel.toJSON());
        //                     defer.resolve(newModel);
        //                 });
        //             }
        //         });

        //         return defer.promise();
        //     },
        //     Sport: function(id){
        //         var defer = $.Deferred();

        //         require(['models/sport'], function(Model){

        //             if(!id || id.length < 1){
        //                 defer.reject();
        //                 return;
        //             }

        //             var newModel = new Model.Sport({
        //                 _id: id
        //             });

        //             if(newModel.hasFetched){
        //                 // Already fetched?
        //                 defer.resolve(newModel);
        //             } else {
        //                 newModel.fetch({prefill: true});
        //                 // console.log(newModel);
        //                 // debugger;
        //                 newModel.populated().done(function(){
        //                     // console.log('USING RESOLVED');
        //                     // console.dir(newModel.toJSON());
        //                     // debugger;
        //                     defer.resolve(newModel);
        //                 });
        //             }
        //         });

        //         return defer.promise();
        //     }
        // },

        Locale: {

            normalize: function(value){
                var tmpValue = value.toString().toLowerCase();
                var allowed_locales = {
                    'en' : ['undefined','en','en_us','en-us']
                };

                var normalized = false;
                _.each(allowed_locales, function(locales, locale_normalized){
                    if(locales.indexOf(tmpValue) !== -1){
                        normalized = locale_normalized;
                    }
                });

                return normalized;
            }

        },

        Popover: {
            Help: function(opts){
                // default options
                opts = _.defaults(opts, {
                    title: null,
                    body: null,
                    on_done: function(){
                        // App.history.navigate('random2',{history: false});
                    }
                });
                App.Cache.HelpPopoverModal = opts;
                // navigate
                App.history.navigate('popover/help', {history: false});
            },
            Buttons: function(opts){
                // default options
                opts = _.defaults(opts, {
                    title: null,
                    text: null,
                    buttons: []
                });

                // opts.on_cancel

                // Options and details
                App.Cache.OptionModal = opts;

                // Change history (must)
                App.history.navigate('popover/buttons', {history: false});
            },
            Alert: function(text, button){
                // default options

                var def = $.Deferred();

                button = button || 'OK';

                // default options
                var opts = {
                    text: text,
                    button: button
                };

                opts.on_done = function(){
                    def.resolve(true);
                };
                opts.on_cancel = function(){
                    def.resolve(false);
                };

                // Options and details
                App.Cache.OptionModal = opts;

                // Change history (must)
                App.history.navigate('popover/alert', {history: false});

                return def.promise();
            },
            Confirm: function(text, buttonYes, buttonNo){
                // default options

                var def = $.Deferred();

                buttonYes = buttonYes || 'Yes';
                buttonNo = buttonNo || 'No';

                // default options
                var opts = {
                    text: text,
                    buttonYes: buttonYes,
                    buttonNo: buttonNo
                };

                opts.on_done = function(){
                    def.resolve(true);
                };
                opts.on_cancel = function(){
                    def.resolve(false);
                };

                // Options and details
                App.Cache.OptionModal = opts;

                // Change history (must)
                App.history.navigate('popover/confirm', {history: false});

                return def.promise();
            },
            Prompt: function(text, defaultValue, button, buttonCancel, type){ // use callback pattern instead?

                var def = $.Deferred();

                defaultValue = defaultValue || '';
                button = button || 'OK';
                buttonCancel = buttonCancel || 'X';
                type = type || 'text';

                // default options
                var opts = {
                    text: text,
                    defaultValue: defaultValue,
                    button: button,
                    buttonCancel: buttonCancel,
                    type: type
                };

                opts.on_done = function(value){
                    def.resolve(value);
                };
                opts.on_cancel = function(){
                    def.resolve(false);
                };

                // Options and details
                App.Cache.OptionModal = opts;

                // Change history (must)
                App.history.navigate('popover/prompt', {history: false});

                return def.promise();
            },
            List: function(opts){

                // defaults
                opts = _.defaults(opts, {
                    list: [],
                    type: 'scroll'
                });

                // Options and details
                App.Cache.OptionModal = opts;


                // Change history (must)
                App.history.navigate('popover/list', {history: false});
            },
            ColorPicker: function(opts){

                // defaults
                opts = _.defaults(opts, {
                    color: '#000'
                });

                // Options and details
                App.Cache.ColorPickerOptions = opts;


                // Change history (must)
                App.history.navigate('popover/colorpicker', {history: false});
            },
            Currency: function(opts){ // use callback pattern instead?

                var def = $.Deferred();

                // defaults
                opts = _.defaults(opts, {
                    title: null
                });

                opts.on_done = function(value){
                    def.resolve(value);
                };
                opts.on_cancel = function(){
                    def.resolve(false);
                };

                // Options and details
                App.Cache.OptionModal = opts;

                // Change history (must)
                App.history.navigate('popover/currency', {history: false});

                return def.promise();
            },
            
            Share: function(options){
                // default sharing optoins

                var def = $.Deferred();

                // default options
                var opts = {
                    details: options,
                    type: 'static'
                };

                opts.on_done = function(){
                    def.resolve(true);
                };
                opts.on_cancel = function(){
                    def.resolve(false);
                };

                // Options and details
                App.Cache.OptionModal = opts;

                // Change history (must)
                var lastHref = window.location.hash;
                console.log(lastHref);
                App.history.navigate('popover/share', {history: false});
                // App.history.navigate(lastHref, {trigger: false, history: false});

                return def.promise();
            },
        },

        Help: function(key){
            Help.launch(key);
        },

        Contacts: {

            // // find all contacts with 'Bob' in any name field
            // var options      = new ContactFindOptions();
            // options.filter   = "Bob";
            // options.multiple = true;
            // options.desiredFields = [navigator.contacts.fieldType.id];
            // var fields       = [navigator.contacts.fieldType.displayName, navigator.contacts.fieldType.name];
            // navigator.contacts.find(fields, onSuccess, onError, options);

        },

        Z: function(amount){ // nudge
            // "nudge" the z-plane a bit
            // console.log(amount / 1000000.0);
            return new StateModifier({transform: Transform.translate(0,0,amount / 1000000.0)})
        },

        usePlane: function(plane_name, add, returnValue){
            // return new StateModifier();
            // console.log(plane_name);
            add = add || 0;
            if(!App.Planes[plane_name]){
                // key doesn't exist, just nudging by some amount (using the Utils.Z function basically)
                plane_name = 'content';
                // return Utils.Z(add);
            }
            // console.log(App.Planes[plane_name] + add);
            // console.log(0.001 + (App.Planes[plane_name] + add)/1000000);
            var value = 0.001 + (App.Planes[plane_name] + add)/1000000;
            if(returnValue){
                return value;
            }
            return new StateModifier({
                transform: Transform.translate(0,0, value)
            });

        },

        toJSONandBack: function(obj){
            return JSON.parse(JSON.stringify(obj));
        },

        bindSize: function(emitter, tmpView, tmpSurface){
            // not really using this function...
            var oldSize = null;
            tmpView.getSize = function(){
                // console.log(tmpSurface._size);
                // this._size = [undefined, tmpSurface._size ? tmpSurface._size[1] : 120];
                this._size = [undefined, tmpSurface._size ? tmpSurface._size[1] : undefined];
                if(oldSize != tmpSurface._size){
                    console.info('new size');
                    console.log(tmpSurface._size, tmpSurface._size ? tmpSurface._size[1] : undefined);
                    emitter.trigger('newsize');
                }
                oldSize = tmpSurface._size;
                return [undefined, tmpSurface._size ? tmpSurface._size[1] : undefined];
            };
        },

        Intent: {
            HandleOpenUrl: function(url){
                // what type of a url are we looking at?

                console.log('url');
                console.log(url);

                var urlhost = 'choice://',

                    n = url.indexOf(urlhost),
                    pathname = url.substring(n + urlhost.length),
                    splitPath = pathname.split('/');

                switch(splitPath[0]){

                    case 'u':
                        Utils.Notification.Toast('Viewing user');

                        App.history.navigate('user/' + splitPath[1]);
                        break;

                    case 'i':

                        Utils.Popover.Buttons({
                            title: 'Opened URL Options',
                            text: 'Choose from the following options',
                            buttons: [{
                                text: 'Make Connection',
                                success: function(){

                                    Utils.Notification.Toast('Creating Connection');

                                    // Check the invite code against the server
                                    // - creates the necessary relationship also
                                    $.ajax({
                                        url: Credentials.server_root + 'friend/connect',
                                        method: 'post',
                                        data: {
                                            from: 'url', // if on the Player Edit / LinkUp page, we'd be using 'linkup'
                                            friend_id: splitPath[1]
                                        },
                                        success: function(response){
                                            if(response.code != 200){
                                                if(response.msg){
                                                    Utils.Popover.Alert(response.msg);
                                                    return;
                                                }
                                                Utils.Popover.Alert('Failed to create connection, please try again');
                                                return false;
                                            }

                                            // Relationship has been created
                                            // - either just added to a player
                                            //      - simply go look at it
                                            // - or am the Owner of a player now
                                            //      - go edit the player

                                            if(response.type == 'friend'){
                                                Utils.Notification.Toast('You have successfully added a friend!');

                                                // Update list of players
                                                App.Data.User.fetch();

                                                // App.history.back();

                                                return;
                                            }

                                        },
                                        error: function(err){
                                            Utils.Popover.Alert('Failed to create connection, please try again');
                                            return;
                                        }
                                    });

                                }
                            }]
                        });

                        break;

                    case 'old_i':
                        Utils.Notification.Toast('Accepting a Friend Invite!');

                        var code = splitPath[1];
                        Utils.Notification.Toast(code);

                        Utils.Popover.Buttons({
                            title: 'Accept Friend Invite?',
                            text: 'You have received one!',
                            buttons: [
                                {
                                    text: 'Nah.'
                                },
                                {
                                    text: 'Yes! We Friends',
                                    success: function(){

                                        // Check the invite code against the server
                                        // - creates the necessary relationship also
                                        $.ajax({
                                            url: Credentials.server_root + 'relationships/invited',
                                            method: 'post',
                                            data: {
                                                from: 'add', // if on the Player Edit / LinkUp page, we'd be using 'linkup'
                                                code: code
                                            },
                                            success: function(response){
                                                if(response.code != 200){
                                                    if(response.msg){
                                                        alert(response.msg);
                                                        return;
                                                    }
                                                    alert('Invalid code, please try again');
                                                    return false;
                                                }

                                                // Relationship has been created
                                                // - either just added to a player
                                                //      - simply go look at it
                                                // - or am the Owner of a player now
                                                //      - go edit the player

                                                if(response.type == 'friend'){
                                                    Utils.Notification.Toast('You have successfully added a friend!');

                                                    // Update list of players
                                                    App.Data.User.fetch();

                                                    // App.history.back();

                                                    return;
                                                }

                                            },
                                            error: function(err){
                                                alert('Failed with that code, please try again');
                                                return;
                                            }
                                        });
                                    }
                                }
                            ]
                        });

                        // Accept via ajax!
                        // - as long as logged in...


                        break;
                    default:
                        Utils.Notification.Toast('Unknown URL');
                        // console.log(parsed.pathname.split('/')[0]);
                        break;
                }

            }
        },

        Clipboard: {

            copyTo: function(string){

                try {
                    window.plugins.clipboard.copy(string);
                    Utils.Notification.Toast('Copied to Clipboard');
                }catch(err){
                    console.error('Failed1');
                    console.error(err);
                    Utils.Notification.Toast('Failed copying to clipboard');
                }

            }

        },

        Analytics: {
            init: function(){
                try {
                    App.Analytics = window.plugins.gaPlugin;
                    App.Analytics.init(function(){
                        // success
                        console.log('Success init gaPlugin');
                    }, function(){
                        // error
                        if(App.Data.usePg){
                            console.error('Failed init gaPlugin');
                            Utils.Notification.Toast('Failed init gaPlugin');
                        }
                    }, Credentials.GoogleAnalytics, 30);
                }catch(err){
                    if(App.Data.usePg){
                        console.error(err);
                    }
                    return false;
                }

                return true;

            },

            trackRoute: function(pageRoute){
                // needs to wait for Utils.Analytics.init()? (should be init'd)
                try{
                    App.Analytics.trackPage(function(){
                        // success
                        // console.log('success');
                    }, function(){
                        // error
                        // console.error('ganalyticserror');
                    }, 'waiting.app/' + pageRoute);
                }catch(err){
                    if(App.Data.usePg){
                        console.error('Utils.Analytics.trackPage');
                        console.error(err);
                        debugger;
                    }
                }
            }
        },

        takePicture: function(camera_type_short, opts, successCallback, errorCallback){
            // Take a picture using the camera or select one from the library
            var that = this;

            var options = { 
                quality : 80,
                destinationType : Camera.DestinationType.FILE_URI,
                sourceType : null, //Camera.PictureSourceType.CAMERA,
                allowEdit : false,
                encodingType: Camera.EncodingType.JPEG,
                // targetWidth: 1000,
                // targetHeight: 1000,
                popoverOptions: CameraPopoverOptions,
                saveToPhotoAlbum: opts.saveToPhotoAlbum || true
              };

            switch(camera_type_short){
                case 'gallery':
                    options.sourceType = Camera.PictureSourceType.PHOTOLIBRARY;
                    break;

                case 'camera':
                default:
                    // camera
                    options.sourceType = Camera.PictureSourceType.CAMERA;
                    break;
            }

            navigator.camera.getPicture(successCallback, errorCallback, options);
                // function (imageURI) {
                //     console.log(imageURI);
                //     that.uploadImage(imageURI);
                // },
                // function (message) {
                //     // We typically get here because the use canceled the photo operation. Fail silently.
                // }, options);

            return false;

        },

        parseUrl: function(url){
            var parser = document.createElement('a');

            // parser.href = "http://example.com:3000/pathname/?search=test#hash";
            parser.href = url;
             
            // parser.protocol; // => "http:"
            // parser.hostname; // => "example.com"
            // parser.port;     // => "3000"
            // parser.pathname; // => "/pathname/"
            // parser.search;   // => "?search=test"
            // parser.hash;     // => "#hash"
            // parser.host;     // => "example.com:3000"

            return parser;

        },

        RemoteRefresh: function(context, snapshot){
            // Default PageView.prototype.remoteRefresh

            if(context.model){
                context.model.fetch();
            }
            if(context.collection){
                context.collection.fetch(); // updates, doesn't take "pager" into account?
            }

            // emit on subviews
            if(context._subviews){
                _.each(context._subviews, function(tmpSubview){
                    if(typeof tmpSubview.remoteRefresh == "function"){
                        tmpSubview.remoteRefresh(snapshot);
                    }
                });
            }

        },

        GetRatio: function(normal_ratio, our_variable, max){
            // Utils.GetRatio([160,320],[window.innerWidth,'x'])
            var val;
            if(our_variable[0] instanceof String){
                // x
                val = (our_variable[1] * normal_ratio[0]) / normal_ratio[1];
            } else {
                // y
                val = (our_variable[0] / normal_ratio[0]) * normal_ratio[1];
            }
            if(max !== undefined && val > max){
                return max;
            }
            return val;

        },

        htmlEncode: function(value){
          //create a in-memory div, set it's inner text(which jQuery automatically encodes)
          //then grab the encoded contents back out.  The div never exists on the page.
          return $('<div/>').text(value).html();
        },

        hbSanitize: function(string){
            // copied from Handlebars.js sanitizing of strings
            var escape = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#x27;",
                "`": "&#x60;"
            };

            var badChars = /[&<>"'`]/g;
            var possible = /[&<>"'`]/;

            function escapeChar(chr) {
                return escape[chr] || "&amp;";
            }

            if (!string && string !== 0) {
              return "";
            }

            // Force a string conversion as this will be done by the append regardless and
            // the regex test will do this transparently behind the scenes, causing issues if
            // an object's to string has escaped characters in it.
            string = "" + string;

            if(!possible.test(string)) { return string; }
            return string.replace(badChars, escapeChar);
        },

        Notification: {
            Toast: function(msg, position){
                // attempting Toast message
                // - position is ignored
                var defer = $.Deferred();
                try {
                    window.plugins.toast.showShortBottom(msg, 
                        function(a){
                            defer.resolve(a);
                        },
                        function(b){
                            defer.reject(b);
                        }
                    );
                }catch(err){
                    console.log('TOAST failed');
                }
                return defer.promise();
            }
        },

        /**
        *
        *  Base64 encode / decode
        *  http://www.webtoolkit.info/
        *
        **/
        Base64: {
         
            // private property
            _keyStr : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
         
            // public method for encoding
            encode : function (input) {
                var output = "";
                var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
                var i = 0;

                input = this._utf8_encode(input);
         
                while (i < input.length) {
         
                    chr1 = input.charCodeAt(i++);
                    chr2 = input.charCodeAt(i++);
                    chr3 = input.charCodeAt(i++);
         
                    enc1 = chr1 >> 2;
                    enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
                    enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
                    enc4 = chr3 & 63;
         
                    if (isNaN(chr2)) {
                        enc3 = enc4 = 64;
                    } else if (isNaN(chr3)) {
                        enc4 = 64;
                    }
         
                    output = output +
                    this._keyStr.charAt(enc1) + this._keyStr.charAt(enc2) +
                    this._keyStr.charAt(enc3) + this._keyStr.charAt(enc4);
         
                }
         
                return output;
            },
         
            // public method for decoding
            decode : function (input) {
                var output = "";
                var chr1, chr2, chr3;
                var enc1, enc2, enc3, enc4;
                var i = 0;
         
                input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
         
                while (i < input.length) {
         
                    enc1 = this._keyStr.indexOf(input.charAt(i++));
                    enc2 = this._keyStr.indexOf(input.charAt(i++));
                    enc3 = this._keyStr.indexOf(input.charAt(i++));
                    enc4 = this._keyStr.indexOf(input.charAt(i++));
         
                    chr1 = (enc1 << 2) | (enc2 >> 4);
                    chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
                    chr3 = ((enc3 & 3) << 6) | enc4;
         
                    output = output + String.fromCharCode(chr1);
         
                    if (enc3 != 64) {
                        output = output + String.fromCharCode(chr2);
                    }
                    if (enc4 != 64) {
                        output = output + String.fromCharCode(chr3);
                    }
         
                }
         
                output = this._utf8_decode(output);
         
                return output;
         
            },
         
            // private method for UTF-8 encoding
            _utf8_encode : function (string) {
                string = string.replace(/\r\n/g,"\n");
                var utftext = "";
         
                for (var n = 0; n < string.length; n++) {
         
                    var c = string.charCodeAt(n);
         
                    if (c < 128) {
                        utftext += String.fromCharCode(c);
                    }
                    else if((c > 127) && (c < 2048)) {
                        utftext += String.fromCharCode((c >> 6) | 192);
                        utftext += String.fromCharCode((c & 63) | 128);
                    }
                    else {
                        utftext += String.fromCharCode((c >> 12) | 224);
                        utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                        utftext += String.fromCharCode((c & 63) | 128);
                    }
         
                }
         
                return utftext;
            },
         
            // private method for UTF-8 decoding
            _utf8_decode : function (utftext) {
                var string = "";
                var i = 0;
                var c2 = 0,
                    c1 = c2,
                    c = c1;
                    
                while ( i < utftext.length ) {
         
                    c = utftext.charCodeAt(i);
         
                    if (c < 128) {
                        string += String.fromCharCode(c);
                        i++;
                    }
                    else if((c > 191) && (c < 224)) {
                        c2 = utftext.charCodeAt(i+1);
                        string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
                        i += 2;
                    }
                    else {
                        c2 = utftext.charCodeAt(i+1);
                        c3 = utftext.charCodeAt(i+2);
                        string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
                        i += 3;
                    }
         
                }
         
                return string;
            }
         
        },

        base64: {

            encode: function(text){
                return Utils.Base64.encode(text);
                // return $.base64.encode(text);
            },

            decode: function(text){
                return Utils.Base64.decode(text);
                // return $.base64.decode(text);
            }

        },

        PairingCode: (function (undefined) {
            var ns = {
                alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567",
                checkSalt : "grass",
                decode: function(inStr, nPos) {
                    var val = this.alphabet.indexOf(inStr.charAt(nPos).toUpperCase());
                    if (val == -1) throw "Decoding error";
                    return val;
                },
                CalculateCheckDigit : function(inStr ) {
                    if(inStr.length!=5)
                        throw "Invalid length";
                    var arrDecode = new Uint8Array(5);
                    arrDecode[0] = this.decode(inStr,0);
                    arrDecode[1] = this.decode(inStr,1);
                    arrDecode[2] = this.decode(inStr,2);
                    arrDecode[3] = this.decode(inStr,3);
                    arrDecode[4] = this.decode(inStr,4);
                    var arrBytes = CryptoJS.lib.WordArray.create(arrDecode);
                    var arrSalt  = CryptoJS.enc.Latin1.parse( this.checkSalt );
                    arrSalt.concat(arrBytes);
                    var arrSha1 = CryptoJS.SHA1(arrSalt);
                    var strHash = arrSha1.toString();
                    var firstByte = strHash.charAt(0) + strHash.charAt(1);
                    var value = parseInt(firstByte,16) & 0x1F;
                    var letter = this.alphabet.charAt(value);
                    return letter;
                }
            };

            return ns;
        }()),


        logout: function(){
            
            // Reset caches and views
            App.Cache = {};
            App.Cache = {
                ModelReplacers: {},
                RoutesByHash: {}
            }

            App.Data = {
                User: null,
                Players: null // preloaded
            };


            // Maintain some localStorage (temporary, during development)
            // - address
            var doSave = true; // toggle for on/off
            var it = [];
            var saved = [];
            it.forEach(function(k){
                saved.push({
                    key: k,
                    value: localStorage.getItem(k)
                });
            });

            // Clear storage
            localStorage.clear();

            if(doSave){
                saved.forEach(function(k){
                    localStorage.setItem(k.key,k.value);
                });
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
                    // 'x-token' : ''
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
            App.history.eraseUntilTag('all-of-em');
            App.history.navigate('landing');
            // window.location = window.location.href.split('#')[0] + '#landing';

            return true;
        },

        ratio_remap: function(old_value, old_range, new_range){
            var new_value = ( (old_value - old_range[0]) / (old_range[1] - old_range[0]) ) * (new_range[1] - new_range[0]) + new_range[0];
            if(new_value > new_range[1]){
                // max
                return new_range[1];
            }
            if(new_value < new_range[0]){
                // min
                return new_range[0];
            }
            return new_value;
        },

        slugToCamel: function (slug) {
            var words = slug.split('_');

            for(var i = 0; i < words.length; i++) {
              var word = words[i];
              words[i] = word.charAt(0).toUpperCase() + word.slice(1);
            }

            return words.join(' ');
        },

        randomInt: function(min, max){
            return Math.floor(Math.random() * (max - min + 1)) + min;
        },

        dataModelReplaceOnSurface : function(Surface){
            // Load driver name and image
            // console.log(context);
            if(typeof App.Cache != typeof {}){
                App.Cache = {};
            }

            var context = $('<div/>').html(Surface.getContent());

            App.Cache.ModelReplacers = App.Cache.ModelReplacers || {};

            context.find('[data-replace-model]').each(function(index){
                var elem = this;
                var model = $(elem).attr('data-replace-model'),
                    id = $(elem).attr('data-replace-id'),
                    field = $(elem).attr('data-replace-field'),
                    target = $(elem).attr('data-target-type'),
                    pre = $(elem).attr('data-replace-pre') || '',
                    cachestring = 'cached_display_v1_' + model + id + field;

                // Surface.setContent(context.html());

                // // See if cached this result already
                // // var tmp = localStorage.getItem(cachestring);
                // var tmp = App.Cache.ModelReplacers[cachestring];
                // if(tmp != undefined){
                //     // Element has been cached, or we're waiting for the response
                //     // - use a deferred
                //     tmp.then(function(result){
                //         // Deferred resolved
                //         try {
                //             var tmp2 = JSON.parse(result);
                //             // Determine target

                //             // Replace text
                //             if(!target || target.length < 1 || target == 'text'){
                //                 var new_text = tmp2.toString();
                //                 $(elem).text($.trim(new_text));

                //                 // Update Surface, setContent
                //                 Surface.setContent(context.html());
                //             }

                //             return;

                //         } catch(err){
                //             console.error(err);
                //         }
                //     });
                //     return;


                // } else {
                //     console.info('Replacement element not cached');
                // }

                // App.Data.Cache.ModelReplacers[cachestring] = $.Deferred();


                Utils.QuickModel(Utils.slugToCamel(model), id).then(function(Model){

                    var value = Model.get(field);

                    // Replace text
                    if(!target || target.length < 1 || target == 'text'){
                        var new_text = '';
                        try {
                            new_text = value.toString();
                        }catch(err){
                            new_text = '';
                            console.log(Model.toJSON());
                            console.log(value);
                            console.error('Failed value of DataModel',err);
                        }
                        $(elem).text(pre + $.trim(new_text));

                        // Update Surface, setContent
                        Surface.setContent(context.html());

                    }

                });

                // require(["app/models/" + model], function (models) {
                //     console.log('ModelReplace request');
                //     var modelName = new models[slugToCamel(model)]({_id: id});
                //     modelName.fetch({
                //         cache: true,
                //         success: function (dataModel) {

                //             var tmp = dataModel.toJSON();

                //             // Split field
                //             var fields = field.split('.');

                //             var current_data_val;
                //             for(field in fields){
                //                 tmp = tmp[fields[field]];
                //             }

                //             // Cache
                //             // App.Data['cached_display_v1_' + model + id + field] = tmp.toString();
                //             // localStorage.setItem(cachestring, JSON.stringify(tmp));
                //             App.Data.Cache.ModelReplacers[cachestring].resolve(JSON.stringify(tmp));

                //             // Determine target

                //             // Replace text
                //             if(!target || target.length < 1 || target == 'text'){
                //                 var new_text = tmp.toString();
                //                 $(elem).text($.trim(new_text));

                //                 // Update Surface, setContent
                //                 Surface.setContent(context.html());

                //             }

                //         }
                //     });
                // });

            });
            
            

        },

        dataModelReplace : function(context){
            // Load driver name and image
            // console.log(context);
            if(typeof App.Data.Cache != typeof {}){
                App.Data.Cache = {};
            }

            App.Data.Cache.ModelReplacers = App.Data.Cache.ModelReplacers || {};

            context.$('[data-replace-model]').each(function(index){
                var elem = this;
                var model = $(elem).attr('data-replace-model'),
                    id = $(elem).attr('data-replace-id'),
                    field = $(elem).attr('data-replace-field'),
                    target = $(elem).attr('data-target-type'),
                    cachestring = 'cached_display_v1_' + model + id + field;

                // See if cached this result already
                // var tmp = localStorage.getItem(cachestring);
                var tmp = App.Data.Cache.ModelReplacers[cachestring];
                if(tmp != undefined){
                    // Element has been cached, or we're waiting for the response
                    // - use a deferred
                    tmp.then(function(result){
                        // Deferred resolved
                        try {
                            var tmp2 = JSON.parse(result);
                            // Determine target

                            // Replace text
                            if(!target || target.length < 1 || target == 'text'){
                                var new_text = tmp2.toString();
                                $(elem).text($.trim(new_text));
                            }

                            return;

                        } catch(err){
                            console.error(err);
                        }
                    });
                    return;


                } else {
                    console.info('Replacement element not cached');
                }

                App.Data.Cache.ModelReplacers[cachestring] = $.Deferred();

                require(["app/models/" + model], function (models) {
                    console.log('ModelReplace request');
                    var modelName = new models[slugToCamel(model)]({_id: id});
                    modelName.fetch({
                        cache: true,
                        success: function (dataModel) {

                            var tmp = dataModel.toJSON();

                            // Split field
                            var fields = field.split('.');

                            var current_data_val;
                            for(field in fields){
                                tmp = tmp[fields[field]];
                            }

                            // Cache
                            // App.Data['cached_display_v1_' + model + id + field] = tmp.toString();
                            // localStorage.setItem(cachestring, JSON.stringify(tmp));
                            App.Data.Cache.ModelReplacers[cachestring].resolve(JSON.stringify(tmp));

                            // Determine target

                            // Replace text
                            if(!target || target.length < 1 || target == 'text'){
                                var new_text = tmp.toString();
                                $(elem).text($.trim(new_text));
                            }

                        }
                    });
                });
            });

        },



        updateGpsPosition: function(){

            try {
                navigator.geolocation.getCurrentPosition(function(position){
                    console.log('coords');
                    console.log(position.coords);
                    App.Events.emit('updated_user_current_location');
                    App.Cache.geolocation_coords = position.coords;

                }, function(err){
                    console.log('GPS failure');
                    console.log(err);
                });
            } catch(err){
                return false;
            }

            return true;

        },

        process_push_notification_message : function(payload){
            // Processing a single Push Notification
            // - not meant for handling a bunch in a row

            console.log(payload);

            if(typeof payload === typeof ""){
                payload = JSON.parse(payload);
            }

            console.log(payload);

            switch(payload.type){

                case 'new_connection':
                    // Already on page?
                    var viewUrl = 'user/' + payload.id;
                    if(App.Cache.currentPageViewPath == viewUrl ){
                        return;
                    }
                    Utils.Popover.Buttons({
                        title: 'New Connection',
                        buttons: [
                            {
                                text: 'View',
                                success: function(){
                                    App.history.navigate(viewUrl);
                                }
                            }
                        ]
                    });
                    
                    break;


                case 'todo_updated':
                    // Already on the page?
                    var viewUrl = 'todo/' + payload.id;
                    if(App.Cache.currentPageViewPath == viewUrl ){
                        return;
                    }
                    Utils.Popover.Buttons({
                        title: 'Job Details Updated',
                        buttons: [
                            {
                                text: 'View',
                                success: function(){
                                    App.history.navigate(viewUrl);
                                }
                            }
                        ]
                    });
                    
                    break;

                case 'todo_assigned':
                    // Already on the page?
                    var viewUrl = 'todo/' + payload.id;
                    if(App.Cache.currentPageViewPath == viewUrl ){
                        return;
                    }
                    Utils.Popover.Buttons({
                        title: 'Job people updated',
                        buttons: [
                            {
                                text: 'View',
                                success: function(){
                                    App.history.navigate(viewUrl);
                                }
                            }
                        ]
                    });
                    
                    break;

                case 'todo_content_added':
                    // Already on the page?
                    var viewUrl = 'todo/' + payload.id;
                    if(App.Cache.currentPageViewPath == viewUrl ){
                        return;
                    }
                    Utils.Popover.Buttons({
                        title: 'New Job Content',
                        buttons: [
                            {
                                text: 'View',
                                success: function(){
                                    App.history.navigate(viewUrl);
                                }
                            }
                        ]
                    });
                    
                    break;

                case 'invoice_updated':
                    // Already on the page?
                    var viewUrl = 'invoice/' + payload.id;
                    if(App.Cache.currentPageViewPath == viewUrl ){
                        return;
                    }
                    Utils.Popover.Buttons({
                        title: 'Invoice Details Updated',
                        buttons: [
                            {
                                text: 'View',
                                success: function(){
                                    App.history.navigate(viewUrl);
                                }
                            }
                        ]
                    });
                    
                    break;

                case 'invoice_assigned':
                    // Already on the page?
                    var viewUrl = 'invoice/' + payload.id;
                    if(App.Cache.currentPageViewPath == viewUrl ){
                        return;
                    }
                    Utils.Popover.Buttons({
                        title: 'Invoice people updated',
                        buttons: [
                            {
                                text: 'View',
                                success: function(){
                                    App.history.navigate(viewUrl);
                                }
                            }
                        ]
                    });
                    
                    break;

                case 'invoice_item_added':
                    // Already on the page?
                    var viewUrl = 'invoice/' + payload.id;
                    if(App.Cache.currentPageViewPath == viewUrl ){
                        return;
                    }
                    Utils.Popover.Buttons({
                        title: 'Item added to Invoice',
                        buttons: [
                            {
                                text: 'View',
                                success: function(){
                                    App.history.navigate(viewUrl);
                                }
                            }
                        ]
                    });
                    
                    break;

                case 'invoice_content_added':
                    // Already on the page?
                    var viewUrl = 'invoice/' + payload.id;
                    if(App.Cache.currentPageViewPath == viewUrl ){
                        return;
                    }
                    Utils.Popover.Buttons({
                        title: 'New Invoice Content',
                        buttons: [
                            {
                                text: 'View',
                                success: function(){
                                    App.history.navigate(viewUrl);
                                }
                            }
                        ]
                    });
                    
                    break;

                case 'new_message_connected':
                case 'new_message_unconnected':
                    // Already on the page?
                    var viewUrl = 'inbox/' + payload.from_user_id;
                    if(App.Cache.currentPageViewPath == viewUrl ){
                        return;
                    }
                    Utils.Popover.Buttons({
                        title: 'New Message',
                        text: payload.text,
                        buttons: [
                            {
                                text: 'View',
                                success: function(){
                                    App.history.navigate(viewUrl);
                                }
                            }
                        ]
                    });
                    
                    break;


                default:
                    Utils.Notification.Toast('Updates Available');
                    // alert('Unknown type');
                    // alert(payload.type);
                    // alert(JSON.stringify(payload));
                    return;
            }

        },


        addLabelsToMap : function(EventOutput, mapView, MapNode, cars, zoomLevel){
            // Putting a label for each leg of the trip
            // - only the beginning of the trip has the "start"
            // - unless the GPS has moved a ton? (we could do haversine)

            var map = mapView.getMap();

            if(map && map.markerList){
                // Map already exists
                // - clear out markers
                _.each(map.markerList, function(marker){
                    map.removeLayer(marker);
                });
                map.markerList = [];
                // return map;
                // return;

            } else {

                // // var mapOptions = {
                // //     zoom: 4,
                // //     // maxZoom: 17,
                // //     mapTypeId: google.maps.MapTypeId.ROADMAP,
                // //     // disableDefaultUI: true
                // //     panControl: false,
                // //     streetViewControl: false,
                // //     zoomControl: false,
                // //     zoomControlOptions: {
                // //         style: google.maps.ZoomControlStyle.SMALL,
                // //         position: google.maps.ControlPosition.RIGHT_BOTTOM
                // //     },
                // //     mapTypeControl: false,
                // //     mapTypeControlOptions: {
                // //         style: google.maps.MapTypeControlStyle.DROPDOWN_MENU
                // //     },
                // //     scaleControl: false
                // // };
                // // map = new google.maps.Map(mapElem, mapOptions);

                // var layer = new L.StamenTileLayer("toner-lite");

                // map = L.map(mapElem, {
                //     zoomControl: false,
                //     attributionControl: false
                // }); //.setView([51.505, -0.09], 13);
                // map.Events = _.extend({}, Backbone.Events);

                // map.on('load', function(){
                //     window.setTimeout(function(){
                //         map.Events.trigger('load');
                //     },300);
                // });

                // // add an OpenStreetMap tile layer
                // // L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
                // //     updateWhenIdle: false,
                // //     attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
                // // }).addTo(map);
                // map.addLayer(layer);

            }

            if(cars.length < 1){
                console.log('No cars');
                return '';
            }

            var markers = [],
                bounds = [],
                paths = [],
                foundCar = false;
  
            console.log(App.Cache.geolocation_coords);

            // First do my current position (if available)
            if(App.Cache.geolocation_coords){

                var me_label = 'Me';
                var latLng = [App.Cache.geolocation_coords.latitude, App.Cache.geolocation_coords.longitude];

                bounds.push(latLng);

                var image = new ImageSurface({
                    size: [true, true],
                    content: 'http://cdn.leafletjs.com/leaflet-0.7.3/images/marker-icon.png'
                });
                var modifier = new Modifier({
                    align: [0, 0],
                    origin: [0.5, 0.5]
                });
                var mapModifier = new MapStateModifier({
                    mapView: mapView,
                    position: latLng,
                    // zoomBase: 15
                });
                // image.on('click', _panToLandmark.bind(mapModifier));
                MapNode.add(mapModifier).add(modifier).add(Utils.usePlane('content',10)).add(image);


                var meMarker = L.marker(latLng);
                markers.push(meMarker);

                // var me_marker = L.marker(latLng, {
                //     icon: new L.Icon.Label.Default({
                //         iconUrl: 'never-exist.png',
                //         iconSize: [1,1],
                //         shadowUrl: 'never-exist.png',
                //         shadowSize: [1,1],
                //         labelText: 'Me',
                //         classStyle: {
                //             'color' : 'blue'
                //         } 
                //     })
                // });

                // // me_marker.bindLabel('Me', {
                // //     noHide: true,
                // //     className: 'leaflet-label'
                // // });

                // me_marker.addTo(map);

                // me_marker.showLabel();


                // new MarkerWithLabel({
                //     position: latLng,
                //     draggable: false,
                //     map: map,
                //     icon: 'never_exist.png', // effectively hides the icon
                //     labelContent: me_label,
                //     labelAnchor: new google.maps.Point(22, 0),
                //     labelClass: "map-label", // the CSS class for the label
                //     labelStyle: {
                //         opacity: 1.0,
                //         background: "blue"
                //     },
                //     labelInBackground: false
                // });

                // me_marker.me_marker = true;
                
                // markers.push(me_marker);
            }

            // Now do Cars
            for(var index in cars){
                var car = _.clone(cars[index]);
                // console.log(tripLegs[index]); // trip object
                try {
                    var gps_position = cars[index].latest_data.lastWaypoint,
                        label = '',
                        latLng = [gps_position.latitude, gps_position.longitude];

                    bounds.push(latLng);

                    index = parseInt(index, 10);

                    // console.log(label);
                    // console.log(cars[index]);
                    // var marker = new google.maps.Marker({
                    //     position: latLng,
                    //     map: map,
                    //     title: label
                    // });
        
                    var marker = L.marker(latLng, {
                        // icon: transparentIcon
                        icon: new L.Icon.Label.Default({
                            iconUrl: 'never-exist.png',
                            iconSize: [1,1],
                            shadowUrl: 'never-exist.png',
                            shadowSize: [1,1],
                            labelText: car.name,
                            classStyle: {
                                'border-color' : car.color,
                                'background-color' : car.color,
                                'color' : tinycolor.mostReadable(car.color, ["#000", "#fff"]).toHexString()
                            } 
                        })
                    });

                    marker.on('click', function(e){
                        EventOutput.trigger('mapclick', {e: e, car: this.car});
                    });

                    // marker.bindLabel(car.name, {
                    //     noHide: true,
                    //     clickable: true,
                    //     className: 'leaflet-label',
                    //     classStyle: {
                    //         'border-color' : car.color
                    //     }
                    // });

                    marker.car = car;
                    marker.car_id = car._id;

                    marker.addTo(map);
                    // marker.showLabel();

                    // var marker = new MarkerWithLabel({
                    //     car: car,
                    //     car_id: car._id,

                    //     position: latLng,
                    //     draggable: false,
                    //     map: map,
                    //     icon: 'never_exist.png', // effectively hides the icon
                    //     labelContent: car.name,
                    //     labelAnchor: new google.maps.Point(22, 0),
                    //     labelClass: "map-label", // the CSS class for the label
                    //     labelStyle: {
                    //         opacity: 1.0,
                    //         background: car.color
                    //     },
                    //     labelInBackground: false
                    // });
                    markers.push(marker);


                    // google.maps.event.addListener(markers[markers.length-1], "click", function (e) {
                    //     // console.log(e);
                    //     EventOutput.trigger('mapclick', {e: e, car: this.car});
                    // });

                    foundCar = true;

                } catch(err){
                    // Failed finding a waypoint for a car
                    // - skipping it for now
                    console.error(err);
                }

            }

            // Find any cars?
            if(foundCar === false){
                // return 'no_cars_with_datapoints';
            }
            console.log(map);
            console.log(bounds);

            map.fitBounds(bounds, {
                maxZoom: 18,
                padding: [20,20]
            });

            map.markerList = markers;

            console.log(bounds);
            // debugger;

        },


        haversine : function(lat1,lat2,lon1,lon2){

            // Run haversine formula
            var toRad = function(val) {
               return val * Math.PI / 180;
            };

            // var lat2 = homelat; 
            // var lon2 = homelon;
            // var lat1 = lat;
            // var lon1 = lon;

            var R = 3959; // km=6371. mi=3959

            //has a problem with the .toRad() method below.
            var x1 = lat2-lat1;
            var dLat = toRad(x1);
            var x2 = lon2-lon1;
            var dLon = toRad(x2);
            var a = Math.sin(dLat/2) * Math.sin(dLat/2) + 
                            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
                            Math.sin(dLon/2) * Math.sin(dLon/2);  
            var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
            var d = R * c; 

            return d;

        },

        toFixedOrNone: function(val, len){
            var tmp = parseFloat(val).toFixed(len).toString();
            if (parseInt(tmp, 10).toString() == tmp){
                return isNaN(tmp) ? '--' : parseInt(tmp, 10).toString();
            }
            return isNaN(tmp) ? '--' : tmp;
        },

        isElementInViewport: function(el) {
            var rect = el.getBoundingClientRect();
            return (
                rect.top >= 0 &&
                rect.left >= 0 &&
                rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) && /*or $(window).height() */
                rect.right <= (window.innerWidth || document.documentElement.clientWidth) /*or $(window).width() */
            );
        },


        Encryption: {
            encrypt: function(string_data){
                return sjcl.encrypt(App.Credentials.encryption_key, string_data)
            },
            decrypt: function(encrypted_string_data){
                return sjcl.decrypt(App.Credentials.encryption_key, encrypted_string_data)
            }

        },

        Storage: {
            // Always use a promise
            useLocalFile: false,
            init: function(){

                var dfd = $.Deferred();

                if(App.Data.usePg && Utils.Storage.useLocalFile){

                    // Read in saved data cache
                    window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, 
                        function (fileSystem) {
                            fileSystem.root.getFile(App.Credentials.cache_file, null, 
                                function (fileEntry) {
                                    fileEntry.file(
                                        function gotFile(file){
                                            var reader = new FileReader();
                                            reader.onloadend = function(evt) {
                                                // console.log(evt.target.result);
                                                try {
                                                    // The reverse of saving
                                                    // - decrypt
                                                    // - decode base64 data
                                                    // - parse JSON string
                                                    // var decrypted = Utils.Encryption.decrypt(evt.target.result);
                                                    // var decrypted = evt.target.result;
                                                    // var b = Utils.base64.decode(decrypted);
                                                    // App.Data.InMemory = JSON.parse(b);
                                                    App.Data.InMemory = JSON.parse(evt.target.result);
                                                } catch(err){
                                                    console.log('Failed parsing cached file');
                                                    console.log(err);
                                                    App.Data.InMemory = {};
                                                }
                                                console.log('LOADED FILE');
                                                dfd.resolve();
                                            };
                                            console.log('LOADING FILE');
                                            reader.readAsText(file);
                                        }, 
                                        fail);
                                }, fail);
                        }, 
                        fail);

                    // Start listener for saving to File API
                    var waitingToSave = 0
                    App.Events.on('FileSave',function(force_immediate){
                        if(force_immediate){

                            // Immediate write
                            window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, 
                                function (fileSystem) {
                                    fileSystem.root.getFile(App.Credentials.cache_file, {create: true, exclusive: false}, 
                                        function (fileEntry) {
                                            fileEntry.createWriter(
                                                function (writer) {
                                                    // Should be analyzing the document storage amount here
                                                    // var bf = new Blowfish(App.Credentials.encryption_key); // what key should I be encrypting it with??
                                                    var j = JSON.stringify(App.Data.InMemory);
                                                    // var b = Utils.base64.encode(j);
                                                    var b = j; // just json.stringified
                                                    // var ciphertext = Utils.Encryption.encrypt(b); // takes FOREVER and locks the process
                                                    var ciphertext = b;
                                                    writer.write(ciphertext);
                                                }, fail);

                                        },
                                    fail);
                                }, 
                                fail);

                        } else {

                            // Merge into a once-every-100ms-at-most queue
                            if(!waitingToSave){
                                waitingToSave = 1;
                                window.setTimeout(function(){
                                    waitingToSave = 0;
                                    // return;
                                    window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, 
                                        function (fileSystem) {
                                            fileSystem.root.getFile(App.Credentials.cache_file, {create: true, exclusive: false}, 
                                                function (fileEntry) {
                                                    fileEntry.createWriter(
                                                        function (writer) {
                                                            // Should be analyzing the document storage amount here
                                                            // var bf = new Blowfish(App.Credentials.encryption_key); // what key should I be encrypting it with??
                                                            var j = JSON.stringify(App.Data.InMemory);
                                                            // var b = Utils.base64.encode(j);
                                                            var b = j; // just json.stringified
                                                            // var ciphertext = Utils.Encryption.encrypt(b); // takes FOREVER and locks the process
                                                            var ciphertext = b;
                                                            writer.write(ciphertext);
                                                        }, fail);

                                                },
                                            fail);
                                        }, 
                                        fail);
                                },3000);
                            }
                            
                        }

                    });

                } else {
                    // No initial storage needed on desktop
                    setTimeout(function(){
                        dfd.resolve();
                    },1);
                }

                function fail(evt) {
                    console.log('FAILED evt');
                    console.log(evt);
                    dfd.resolve();
                    // console.log(evt.target.error.code);
                }

                return dfd.promise();

            },

            get: function(key, namespace){
                namespace = (namespace != undefined) ? namespace.toString() + '_' : false || '_';
                // console.log('using ns');
                // console.log(namespace);
                try {
                    key = key.toString();
                } catch(err){
                    console.error('Storage get error');
                    console.log(key);
                    console.error(err);
                    return false;
                }

                var dfd = $.Deferred();

                if(App.Data.usePg && Utils.Storage.useLocalFile){


                    setTimeout(function(){

                        try {
                            var value = App.Data.InMemory[namespace + key];
                        } catch(err){
                            dfd.resolve(null);
                            return;
                        }

                        // Resolve with result of cache
                        dfd.resolve(value);
                        return;

                    },1);

                    // Trigger file save
                    // App.Events.trigger('FileSave');



                } else {

                    // Open database
                    // - switch Phonegap/cordova to Database instead of localStorage?
                    // - persistent? 
                    // var dbShell = window.openDatabase('convomail', "1.0", database_displayname, "Convomail", 1000000);
                    
                    setTimeout(function(){
                        var value = window.localStorage.getItem(namespace + key);

                        try {
                            value = JSON.parse(value);
                        } catch(err){
                            dfd.resolve(null);
                            return;
                        }

                        dfd.resolve(value);

                    },1);

                } 

                return dfd.promise();

            },

            set: function(key, value, namespace){
                namespace = (namespace != undefined) ? namespace + '_' : false || '_';
                key = key.toString();

                var dfd = $.Deferred();

                if(App.Data.usePg && Utils.Storage.useLocalFile){
                    // Using local key:value storage with updates serialized using File API
                    
                    setTimeout(function(){

                        try {
                            App.Data.InMemory[namespace + key] = value;
                        } catch(err){

                        }

                        // Trigger file save
                        App.Events.trigger('FileSave');

                        // Resolve with result of cache
                        dfd.resolve();

                    },1);


                } else {

                    setTimeout(function(){

                        try {
                            var tmp = window.localStorage.setItem(namespace + key, JSON.stringify(value));
                        } catch(err){

                            // if (err.name === 'QUOTA_EXCEEDED_ERR' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
                            console.warn('over quota');
                            if ( err.name.toUpperCase().indexOf('QUOTA') >= 0 ) {
                                console.log('yes over');
                                // Exceeded localStorage cache
                                // - like to use something beside localStorage anyways

                                // Flush things we don't need anymore
                                Utils.Storage.flush()
                                    .then(function(){
                                        // Should have room now
                                        console.warn('trying again');
                                        // Try again
                                        // - if failed trying again, then just give up and resolve as False
                                        try {
                                            var tmp = window.localStorage.setItem(namespace + key, JSON.stringify(value));
                                        } catch(err){
                                            // Reject promise
                                            dfd.reject(tmp);
                                            return;
                                        }

                                    });

                                return;

                            }

                            // Other error

                            // Reject promise
                            dfd.reject(tmp);
                            return;

                        }
                        
                        // Resole with result of cache
                        dfd.resolve(tmp);

                    },1);

                }

                return dfd.promise();
            },

            flush: function(){
                // Flushes all non-important values out of the cache
                // - simplest way to do it for now

                console.log('flushing');

                var dfd = $.Deferred();

                if(App.Data.usePg && Utils.Storage.useLocalFile){
                    // Trigger flushing of local filesystem?

                    try {
                        setTimeout(function(){

                            // get keys
                            var keys = Object.keys(App.Data.InMemory);
                            _.each(keys, function(key,idx){
                                if (key.indexOf('critical_') !== 0) {
                                    // console.info(key);
                                    delete App.Data.InMemory[key];
                                }
                            });

                            // var i, key, remove = [];
                            // for (i=0; i < window.localStorage.length ; i++) {
                            //  key = localStorage.key(i);
                            //  if (key.indexOf('critical_') !== 0) {
                            //      // console.info(key);
                            //      remove.push(key);
                            //  }
                            // }
                            // for (i=0; i<remove.length; i++){
                            //  // console.log(3);
                            //  window.localStorage.removeItem(remove[i]);
                            // }

                            // Save new App.Data.InMemory
                            App.Events.trigger('FileSave');

                            // Resolve after completed
                            dfd.resolve(true);
                        }, 1);
                    } catch(err){
                        console.error(err);
                    }


                } else {
                    // Get latest values

                    try {
                        setTimeout(function(){
                            var i, key, remove = [];
                            for (i=0; i < window.localStorage.length ; i++) {
                                key = localStorage.key(i);
                                if (key.indexOf('critical_') !== 0) {
                                    // console.info(key);
                                    remove.push(key);
                                }
                            }
                            for (i=0; i<remove.length; i++){
                                // console.log(3);
                                window.localStorage.removeItem(remove[i]);
                            }
                            // Resolve after completed
                            dfd.resolve(true);
                        }, 1);
                    } catch(err){
                        console.error(err);
                    }

                    
                }


                return dfd.promise();

            }

        },

        // MD5 (Message-Digest Algorithm) by WebToolkit
        // http://www.webtoolkit.info/javascript-md5.html
        MD5 : function(s){function L(k,d){return(k<<d)|(k>>>(32-d))}function K(G,k){var I,d,F,H,x;F=(G&2147483648);H=(k&2147483648);I=(G&1073741824);d=(k&1073741824);x=(G&1073741823)+(k&1073741823);if(I&d){return(x^2147483648^F^H)}if(I|d){if(x&1073741824){return(x^3221225472^F^H)}else{return(x^1073741824^F^H)}}else{return(x^F^H)}}function r(d,F,k){return(d&F)|((~d)&k)}function q(d,F,k){return(d&k)|(F&(~k))}function p(d,F,k){return(d^F^k)}function n(d,F,k){return(F^(d|(~k)))}function u(G,F,aa,Z,k,H,I){G=K(G,K(K(r(F,aa,Z),k),I));return K(L(G,H),F)}function f(G,F,aa,Z,k,H,I){G=K(G,K(K(q(F,aa,Z),k),I));return K(L(G,H),F)}function D(G,F,aa,Z,k,H,I){G=K(G,K(K(p(F,aa,Z),k),I));return K(L(G,H),F)}function t(G,F,aa,Z,k,H,I){G=K(G,K(K(n(F,aa,Z),k),I));return K(L(G,H),F)}function e(G){var Z;var F=G.length;var x=F+8;var k=(x-(x%64))/64;var I=(k+1)*16;var aa=Array(I-1);var d=0;var H=0;while(H<F){Z=(H-(H%4))/4;d=(H%4)*8;aa[Z]=(aa[Z]|(G.charCodeAt(H)<<d));H++}Z=(H-(H%4))/4;d=(H%4)*8;aa[Z]=aa[Z]|(128<<d);aa[I-2]=F<<3;aa[I-1]=F>>>29;return aa}function B(x){var k="",F="",G,d;for(d=0;d<=3;d++){G=(x>>>(d*8))&255;F="0"+G.toString(16);k=k+F.substr(F.length-2,2)}return k}function J(k){k=k.replace(/rn/g,"n");var d="";for(var F=0;F<k.length;F++){var x=k.charCodeAt(F);if(x<128){d+=String.fromCharCode(x)}else{if((x>127)&&(x<2048)){d+=String.fromCharCode((x>>6)|192);d+=String.fromCharCode((x&63)|128)}else{d+=String.fromCharCode((x>>12)|224);d+=String.fromCharCode(((x>>6)&63)|128);d+=String.fromCharCode((x&63)|128)}}}return d}var C=Array();var P,h,E,v,g,Y,X,W,V;var S=7,Q=12,N=17,M=22;var A=5,z=9,y=14,w=20;var o=4,m=11,l=16,j=23;var U=6,T=10,R=15,O=21;s=J(s);C=e(s);Y=1732584193;X=4023233417;W=2562383102;V=271733878;for(P=0;P<C.length;P+=16){h=Y;E=X;v=W;g=V;Y=u(Y,X,W,V,C[P+0],S,3614090360);V=u(V,Y,X,W,C[P+1],Q,3905402710);W=u(W,V,Y,X,C[P+2],N,606105819);X=u(X,W,V,Y,C[P+3],M,3250441966);Y=u(Y,X,W,V,C[P+4],S,4118548399);V=u(V,Y,X,W,C[P+5],Q,1200080426);W=u(W,V,Y,X,C[P+6],N,2821735955);X=u(X,W,V,Y,C[P+7],M,4249261313);Y=u(Y,X,W,V,C[P+8],S,1770035416);V=u(V,Y,X,W,C[P+9],Q,2336552879);W=u(W,V,Y,X,C[P+10],N,4294925233);X=u(X,W,V,Y,C[P+11],M,2304563134);Y=u(Y,X,W,V,C[P+12],S,1804603682);V=u(V,Y,X,W,C[P+13],Q,4254626195);W=u(W,V,Y,X,C[P+14],N,2792965006);X=u(X,W,V,Y,C[P+15],M,1236535329);Y=f(Y,X,W,V,C[P+1],A,4129170786);V=f(V,Y,X,W,C[P+6],z,3225465664);W=f(W,V,Y,X,C[P+11],y,643717713);X=f(X,W,V,Y,C[P+0],w,3921069994);Y=f(Y,X,W,V,C[P+5],A,3593408605);V=f(V,Y,X,W,C[P+10],z,38016083);W=f(W,V,Y,X,C[P+15],y,3634488961);X=f(X,W,V,Y,C[P+4],w,3889429448);Y=f(Y,X,W,V,C[P+9],A,568446438);V=f(V,Y,X,W,C[P+14],z,3275163606);W=f(W,V,Y,X,C[P+3],y,4107603335);X=f(X,W,V,Y,C[P+8],w,1163531501);Y=f(Y,X,W,V,C[P+13],A,2850285829);V=f(V,Y,X,W,C[P+2],z,4243563512);W=f(W,V,Y,X,C[P+7],y,1735328473);X=f(X,W,V,Y,C[P+12],w,2368359562);Y=D(Y,X,W,V,C[P+5],o,4294588738);V=D(V,Y,X,W,C[P+8],m,2272392833);W=D(W,V,Y,X,C[P+11],l,1839030562);X=D(X,W,V,Y,C[P+14],j,4259657740);Y=D(Y,X,W,V,C[P+1],o,2763975236);V=D(V,Y,X,W,C[P+4],m,1272893353);W=D(W,V,Y,X,C[P+7],l,4139469664);X=D(X,W,V,Y,C[P+10],j,3200236656);Y=D(Y,X,W,V,C[P+13],o,681279174);V=D(V,Y,X,W,C[P+0],m,3936430074);W=D(W,V,Y,X,C[P+3],l,3572445317);X=D(X,W,V,Y,C[P+6],j,76029189);Y=D(Y,X,W,V,C[P+9],o,3654602809);V=D(V,Y,X,W,C[P+12],m,3873151461);W=D(W,V,Y,X,C[P+15],l,530742520);X=D(X,W,V,Y,C[P+2],j,3299628645);Y=t(Y,X,W,V,C[P+0],U,4096336452);V=t(V,Y,X,W,C[P+7],T,1126891415);W=t(W,V,Y,X,C[P+14],R,2878612391);X=t(X,W,V,Y,C[P+5],O,4237533241);Y=t(Y,X,W,V,C[P+12],U,1700485571);V=t(V,Y,X,W,C[P+3],T,2399980690);W=t(W,V,Y,X,C[P+10],R,4293915773);X=t(X,W,V,Y,C[P+1],O,2240044497);Y=t(Y,X,W,V,C[P+8],U,1873313359);V=t(V,Y,X,W,C[P+15],T,4264355552);W=t(W,V,Y,X,C[P+6],R,2734768916);X=t(X,W,V,Y,C[P+13],O,1309151649);Y=t(Y,X,W,V,C[P+4],U,4149444226);V=t(V,Y,X,W,C[P+11],T,3174756917);W=t(W,V,Y,X,C[P+2],R,718787259);X=t(X,W,V,Y,C[P+9],O,3951481745);Y=K(Y,h);X=K(X,E);W=K(W,v);V=K(V,g)}var i=B(Y)+B(X)+B(W)+B(V);return i.toLowerCase()},

        S4: function() {
            return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
        },

        guid: function() {
            return (Utils.S4()+Utils.S4()+"-"+Utils.S4()+"-"+Utils.S4()+"-"+Utils.S4()+"-"+Utils.S4()+Utils.S4()+Utils.S4());
        },

        Validate: {

            email: function(email_address){
                if (/^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))$/i.test(email_address)){
                    // Passed validation
                    return true;
                } else {
                    return false;
                }
            }

        },


        utf8: {
        
            // https://gist.github.com/Nijikokun/5192472
            encode: function (string) {
              if (typeof string !== 'string') return string;
              else string = string.replace(/\r\n/g, "\n");
              var output = "", i = 0, charCode;
         
              for (i; i < string.length; i++) {
                charCode = string.charCodeAt(i);
         
                if (charCode < 128)
                  output += String.fromCharCode(charCode);
                else if ((charCode > 127) && (charCode < 2048))
                  output += String.fromCharCode((charCode >> 6) | 192),
                  output += String.fromCharCode((charCode & 63) | 128);
                else
                  output += String.fromCharCode((charCode >> 12) | 224),
                  output += String.fromCharCode(((charCode >> 6) & 63) | 128),
                  output += String.fromCharCode((charCode & 63) | 128);
              }
         
              return output;
            },
         
            decode: function (string) {
              if (typeof string !== 'string') return string;
              var output = "", i = 0, charCode = 0;
         
              while (i < string.length) {
                charCode = string.charCodeAt(i);
         
                if (charCode < 128)
                  output += String.fromCharCode(charCode),
                  i++;
                else if ((charCode > 191) && (charCode < 224))
                  output += String.fromCharCode(((charCode & 31) << 6) | (string.charCodeAt(i + 1) & 63)),
                  i += 2;
                else
                  output += String.fromCharCode(((charCode & 15) << 12) | ((string.charCodeAt(i + 1) & 63) << 6) | (string.charCodeAt(i + 2) & 63)),
                  i += 3;
              }
         
              return output;
            }
         
        },

        // copy
        cp: function(old_obj){
            var tmp = JSON.stringify(old_obj);
            if(typeof(tmp) == "undefined"){
                return null;
            }
            return JSON.parse(tmp);
        },

        Date: {
                getMonthAbbr: function(datetime_obj){
                    // Must already be a datetime_obj
                    var d=new Date(datetime_obj);
                    var month=new Array();
                    month[0]="Jan";
                    month[1]="Feb";
                    month[2]="Mar";
                    month[3]="Apr";
                    month[4]="May";
                    month[5]="Jun";
                    month[6]="Jul";
                    month[7]="Aug";
                    month[8]="Sept";
                    month[9]="Oct";
                    month[10]="Nov";
                    month[11]="Dec";
                    var n = month[d.getMonth()];
                    return n;
                }
        },

        cc_spaces: function(str){
            // convert camel case to spaces
            // - useful for labels

            str = $.trim(str.replace(/([A-Z])/g, ' $1').replace(/^./, function(str){ return str.toUpperCase(); }));

            return str;

        },
         
        
        gravatar: function (email,size){
            var size = size || 80;
            var alt = encodeURI('www.gravatar.com/avatar/00000000000000000000000000000000?d=mm');
            return 'http://www.gravatar.com/avatar/' + Utils.MD5(email) + '.jpg?s=' + size + '&d='+alt;
        },


        urldecode: function(url){
            return decodeURIComponent((url+'').replace(/\+/g, '%20'));
        },


        // Sort by ASC, DESC, on a pre-defined field in an obj
        sortBy: function (in_opts){

            var defaults = {
                arr: [],
                path: 'attributes.value',
                direction: 'asc', // desc
                type: 'number',
                model: false
            };

            opts = $.extend(defaults,in_opts);

            // arr: the stuff we're sorting
            // path: the object path to sort based on
            //      - not sure how to actually do this? (could just only allow first-level elements to be named? That doesn't work where cuz Thread.latest..)
            // direction: 'asc' or 'desc'
            // type: of sorting to do (number, string, date, auto)

            direction = $.trim(opts.direction.toLowerCase());
            type = $.trim(opts.type.toLowerCase());

            // Determine what type is (if auto)
            if(type == undefined || type == null || type == 'auto' || type == 'num'){
                type = 'number';
            }

            // If path == null, then don't sort on a path?
            // - automatically happens by skipping $.each (below)

            path = opts.path.split('.');
            // clog('path');
            // clog(path);

            // Put humptydumpty back together
            // - [ and ] designate start/end
            var to_unset = [];
            var waiting_for_end = false;
            var extended_string = [];
            // $.each(path,function(i,v){
            //  if(v.substr(0,1) == '['){
            //      // Count until the next ']' in this array
            //      // - could also do some recursion if I get bored, depths of "["
            //      waiting_for_end = true;
            //      extended_string = [];
            //      extended_string.push(v.substr(1));
            //      to_unset.push(i);
            //  } else if(waiting_for_end && v.substr(-1,1) == ']'){
            //      // End is here

            //      waiting_for_end = false;
            //      extended_string.push(v.substr(0,v.length - 1));

            //      path[i] = extended_string.join('.');

            //  } else if(waiting_for_end) {
            //      // Need to add to_unset and extended_string
            //      extended_string.push(v.substr(0,v.length - 1));
            //      to_unset.push(i);
            //  } else {
            //      // everything else is normal
            //  }
            // });
            $.each(path,function(i,v){
                if(v.substr(0,1) == '['){
                    path[i] = parseInt(v.substr(1,v.length - 2));
                }
            });
            // $.each(to_unset,function(u_i,u_v){
            //  clog('unset');
            //  clog(u_v);
            //  path.splice(u_v,1);
            // });
            // clog(extended_string);

            // If not an array, convert to one
            var tmp = [];
            if(typeof(opts.arr) != 'array'){
                // iterate through and convert to an array
                $.each(opts.arr,function(i,v){
                    tmp.push(v);
                });
                // reset to original obj
                opts.arr = tmp;
            }

            if(opts.arr.toString != '[object Array]'){
                opts.arr = _.map(opts.arr,function(v){
                    return v;
                });
            }

            if(direction == 'asc' || direction == 'desc'){
                // Can I pass things into this array?
                // - basic scope question for Robert

                opts.arr.sort(function(a,b){

                    // Turn a model into valid paths
                    if(opts.model){
                        a = _.clone(a.attributes);
                        b = _.clone(b.attributes);
                    }

                    // Convert the path into something useful
                    var validPaths = true;
                    $.each(path,function(i,v){
                        if(typeof a == 'undefined' || typeof b == 'undefined'){
                            // missing path
                            clog('missing path for variable');
                            validPaths = false;
                            return;
                        }

                        // Continue down path
                        a = a[v];
                        b = b[v];

                    });

                    // Invalid paths, return a tie
                    if(validPaths === false){
                        return 0;
                    }

                    // Sort by correct type
                    if(type == 'date' || type == 'datetime' || type == 'time'){
                        var a_tmp = new Date(a);
                        var b_tmp = new Date(b);

                        // Try iso dates
                        if(a_tmp.toString() == 'Invalid Date'){
                            a_tmp.setISO8601(a);
                        }
                        if(b_tmp.toString() == 'Invalid Date'){
                            b_tmp.setISO8601(b);
                        }

                        a_tmp = a_tmp.getTime();
                        b_tmp = b_tmp.getTime();
                    }
                    if(type == 'number' || type=='num'){
                        var a_tmp = a;
                        var b_tmp = b;
                    }
                    if(type == 'string'){
                        var a_tmp = a;
                        var b_tmp = b;
                    }

                    // clog('a,b');
                    // clog(a_tmp + ',' + b_tmp);
                    // clog(path);
                    // clog();
                    
                    if(a_tmp > b_tmp){
                        return direction == 'asc' ? -1 : 1;
                    } else if(a_tmp < b_tmp){
                        return direction == 'asc' ? 1 : -1;
                    } else {
                        // Equal
                        return 0;
                    }

                });

            } else {
                clog('Sorting without asc or desc');
            }

            return opts.arr;

        },

        getUrlVars: function(full_url){
            if(!full_url){
                full_url = window.location.href;
            }
            var vars = [], hash;
            var hashes = full_url.slice(full_url.indexOf('?') + 1).split('&');
            for(var i = 0; i < hashes.length; i++)
            {
                hash = hashes[i].split('=');
                vars.push(hash[0]);
                vars[hash[0]] = hash[1];
            }
            return vars;
        },

        getOAuthParamsInUrl: function(url){
                
            var queryString = location.hash.substring(1); // remove "#"
            if(url){
                var tmp = document.createElement('a');
                tmp.href = url;
                queryString = tmp.hash.substring(1); // remove "#"
            }

            var oauthParams = {},
                regex = /([^&=]+)=([^&]*)/g,
                m;

            while (m = regex.exec(queryString)){
                oauthParams[decodeURIComponent(m[1])] = decodeURIComponent(m[2]);
            }

            return oauthParams;
        },

        safeString: function(str){
            return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        },

        nl2br: function(str, is_xhtml) {
            // http://kevin.vanzonneveld.net
            // - nl2br() => php.js
            var breakTag = (is_xhtml || typeof is_xhtml === 'undefined') ? '<br ' + '/>' : '<br>';
            return (str + '').replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1' + breakTag + '$2');
        },

        extract: {
            
            PhoneNumber: function(haystack_array) {
                //purpose:
                // extracts the first phone number found in haystack, returns false if none are found.
                //args: haystack = string that may contain phone number
                //returns:
                //phone number (string), formatted as xxx-xxx-xxxx, false if no number found

                var phones = [];

                if(typeof(haystack_array) !== 'object'){
                    haystack_array = [haystack_array];
                }

                for (x in haystack_array){
                    var haystack = haystack_array[x];

                    if (typeof haystack !== 'string') {
                        return false;
                    }
                    var phone_regex1 = /(?:(?:\+?1\s*(?:[.-]\s*)?)?(?:\(\s*([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9])\s*\)|([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9]))\s*(?:[.-]\s*)?)?([2-9]1[02-9]|[2-9][02-9]1|[2-9][02-9]{2})\s*(?:[.-]\s*)?([0-9]{4})(?:\s*(?:#|x\.?|ext\.?|extension)\s*(\d+))?/;
                    var phone_regex2 = /(\d{1}\s\(\d{3}\)\s\d{3}-\d{4})/;
                    var phone_regex3 = /^(1\s*[-\/\.]?)?(\((\d{3})\)|(\d{3}))\s*[-\/\.]?\s*(\d{3})\s*[-\/\.]?\s*(\d{4})\s*(([xX]|[eE][xX][tT])\.?\s*(\d+))*$/;
                    var phone_regex4 = /(((\(\d{3}\)|\d{3})[-\s]*)?\d{3}[-\s]*\d{4}|\d{10}|\d{7})/;
                    //hack: facebook sometimes formats phone numbers as 1 (555) 555-5555 which is not matched by the first regex


                    phone1 = phone_regex1.exec(haystack);
                    phone2 = phone_regex2.exec(haystack);
                    phone3 = phone_regex3.exec(haystack);
                    phone4 = phone_regex4.exec(haystack);

                    phones = phones.concat(phone1,phone2,phone3,phone4);

                }

                // Normalize the phone numbers
                phones = _.uniq(phones);
                phones = _.without(phones,null,undefined,"");

                $.each(phones,function(i,phone){

                    // Must be above a certain length (6 chars)
                    if(phone.length < 7){
                        delete phones[i];
                    }

                });

                return phones;

            },
        
            Shipping: function(haystack_array) {
                //purpose:
                // extracts the first phone number found in haystack, returns false if none are found.
                //args: haystack = string that may contain phone number
                //returns:
                //phone number (string), formatted as xxx-xxx-xxxx, false if no number found
                
                // http://answers.google.com/answers/threadview/id/207899.html

                var shipping = [];
                var found_numbers = [];

                if(typeof(haystack_array) !== 'object'){
                    haystack_array = [haystack_array];
                }

                for (x in haystack_array){
                    var haystack = haystack_array[x];

                    if (typeof haystack !== 'string') {
                        return false;
                    }

                    var carriers = {
                        'ups' : {
                            'name' : 'UPS',
                            'regex' : [ /\b(1Z ?[0-9A-Z]{3} ?[0-9A-Z]{3} ?[0-9A-Z]{2} ?[0-9A-Z]{4} ?[0-9A-Z]{3} ?[0-9A-Z]|[\dT]\d\d\d ?\d\d\d\d ?\d\d\d)\b/ ]
                        },
                        'fedex' : {
                            'name' : 'FedEx',
                            'regex' : [ /(\b96\d{20}\b)|(\b\d{15}\b)|(\b\d{12}\b)/,
                                        /\b((98\d\d\d\d\d?\d\d\d\d|98\d\d) ?\d\d\d\d ?\d\d\d\d( ?\d\d\d)?)\b/,
                                        /^[0-9]{15}$/
                                        ]
                        },
                        'usps' : {
                            'name' : 'USPS',
                            'regex' : [ /^E\D{1}\d{9}\D{2}$|^9\d{15,21}$/,
                                        /^91[0-9]+$/,
                                        /^[A-Za-z]{2}[0-9]+US$/
                                        ]
                        }
                    };

                    // Run regex

                    $.each(carriers,function(i,carrier){
                        // Run regex against the haystack
                        $.each(carrier['regex'],function(i,regex){
                            var tracking_nums = regex.exec(haystack);
                            
                            if(typeof tracking_nums === 'object' && tracking_nums != null){

                                // Remove bad entries
                                tracking_nums = _.uniq(tracking_nums);
                                tracking_nums = _.without(tracking_nums,null,undefined,"");

                                $.each(tracking_nums,function(i,tracking_num){ 
                                    // Already found that num?
                                    if($.inArray(tracking_num,found_numbers) == -1){
                                        // Not found

                                        // Add to shipping
                                        shipping.push({
                                            'number' : tracking_num,
                                            'service' : carrier['name'],
                                            'url' : '#'
                                        });
                                        found_numbers.push(tracking_num);
                                    }
                                });
                            }

                        });
                    });

                }

                return shipping;

            }

        }, 

        explore: function(obj){

            Api.search({
                data: {
                    'model' : obj.model,
                    'fields' : [],
                    'conditions' : {
                        '_id' : obj._id
                    },
                    'limit' : 1
                },
                success: function(response){

                    // Parse
                    try {
                        var json = $.parseJSON(response);
                    } catch (err){
                        alert("Failed parsing JSON");
                        return;
                    }

                    // Check the validity
                    if(json.code != 200){
                        // Expecting a 200 code returned
                        clog('200 not returned');
                        return;
                    }

                    // 1 entry?
                    if(json.data.length != 1){
                        alert('Had trouble gathering info');
                        return;
                    }

                    // Get the Email data
                    var data = json.data[0];

                    // Remove any previous version
                    $('#modalExplorer').remove();

                    var template = Utils.template('t_modal_explorer');
                    $('body').append(template());
                    
                    //response = {"hello" : "hi"};
                    JSONFormatter.format(data, {'appendTo' : '#modalExplorer',
                                                'collapse' : true});

                    $('#modalExplorer').modal();

                    // Getting path to highlighted element
                    
                    $('#modalExplorer .key').each(function(i,that){
                        var paths = [];
                        $($(that).parents('ul:not(#json)').get().reverse()).each(function(i,elem){
                            paths.push($(elem).parent().find('> span.key').text());
                        });
                            
                        var path;

                        if(paths.length == 0){
                            path = $(that).text();
                        } else {
                            path = paths.join('.');
                            path += '.' + $(that).text();
                        }

                        $(that).attr('title',path);

                    });

                    $('#modalExplorer .key').after('<span class="colon">:</span>');

                    $('#modalExplorer .key').tooltip();
                    

                }
            });
        },

        exploreModal: function(opts){
            $('#mainModal').modal(opts)
        },

        noty: function(opts){

            // Would be fun to use http://soulwire.github.com/Makisu/

            var defaults = {

                text: "",
                layout: 'topRight',
                type: 'alert',
                timeout: 5000, // delay for closing event. Set false for sticky notifications
                closeWith: ['click'], // ['click', 'button', 'hover']
                animation: {
                    open:{
                        opacity: "toggle"
                    },
                    close:{
                        opacity: "toggle"
                    },
                    easing:'swing',
                    speed:500
                }
            };

            opts = $.extend(defaults,opts);

            return noty(opts);

        },

        reloadApp: function(){
            // Reload the page
            window.location = [location.protocol, '//', location.host, location.pathname].join('');
            
        },

        Handelbars: {

            thread_participants_pretty: function(){
                var all_names = [];

                // Received or Sent?
                var email_address = '';
                
                // Doesn't matter, just summarize everybody
                var to_search = ['From'];

                _.each(Email, function(email){

                    _.each(to_search,function(search_val, i){
                        var tmp = search_val + '_Parsed';
                        if(typeof email.original.headers[tmp] == 'undefined'){
                            return;
                        }
                        // Parse search values
                        _.each(email.original.headers[tmp],function(person, k){
                            var name = person[0],
                                email = person[1];

                            if(name.substr(0,7) == '=?utf-8'){
                                console.log('Odd name:', name);
                                name = Utils.utf8.decode(name);
                            }

                            var tmp_isme = false;
                            // _.each(App.Data.UserEmailAccounts.toJSON(),function(acct, l){
                            //     if(acct.email == email){
                            //         tmp_isme = true;
                            //     }
                            // });

                            if(tmp_isme){
                                if(search_val == 'To'){
                                    return;
                                }
                                all_names.push('Me');
                                return;
                            }

                            if(name.length < 1 || name.length > 50){
                                // clog('Too short, or too long of name');
                                // clog(name);
                                all_names.push('Unknown');
                                return;
                            }
                            all_names.push(name);
                        });
                    });

                });

                // Re-order so that the order of the names matches...
                // - what makes sense to match? What order? Latest entry?

                all_names = _.uniq(all_names);
                all_names = all_names.reverse(); // todo - make sure getting valid/ordered results here

                return all_names.join(', ');

            }
        }


    };

    String.prototype.capitalize = function() {
        return this.charAt(0).toUpperCase() + this.slice(1);
    }

    return Utils;


});