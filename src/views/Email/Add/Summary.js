define(function(require, exports, module) {

    var Engine = require('famous/core/Engine');
    var View = require('famous/core/View');
    var ScrollView = require('famous/views/Scrollview');
    var SequentialLayout = require('famous/views/SequentialLayout');
    var FlexibleLayout = require('famous/views/FlexibleLayout');
    var Surface = require('famous/core/Surface');
    var InputSurface = require('famous/surfaces/InputSurface');
    var VideoSurface = require('famous/surfaces/VideoSurface');
    var Modifier = require('famous/core/Modifier');
    var StateModifier = require('famous/modifiers/StateModifier');
    var Transitionable     = require('famous/transitions/Transitionable');
    var Transform = require('famous/core/Transform');
    var Matrix = require('famous/core/Transform');
    var RenderNode         = require('famous/core/RenderNode')

    var Utility = require('famous/utilities/Utility');
    var Timer = require('famous/utilities/Timer');

    var HeaderFooterLayout = require('famous/views/HeaderFooterLayout');
    var NavigationBar = require('famous/widgets/NavigationBar');
    var TabBar = require('famous/widgets/TabBar');
    var GridLayout = require("famous/views/GridLayout");

    // Extras
    var Credentials         = JSON.parse(require('text!credentials.json'));
    var $ = require('jquery');
    var Utils = require('utils');

    // Curves
    var Easing = require('famous/transitions/Easing');

    // Views
    var StandardPageView = require('views/common/StandardPageView');
    var StandardHeader = require('views/common/StandardHeader');
    var FormHelper = require('views/common/FormHelper');
    var BoxLayout = require('famous-boxlayout');
    var LayoutBuilder = require('views/common/LayoutBuilder');

    // Models
    var EmailModel = require('models/email');

    // Templates
    var Handlebars          = require('lib2/handlebars-adapter');
    var tpl_detail        = require('text!./tpl/SummaryDetail.html');
    var template_detail   = Handlebars.compile(tpl_detail);

    var FormHelper = require('views/common/FormHelper');

    // var tpl_payment        = require('text!./tpl/SummaryPayment.html');
    // var template_payment   = Handlebars.compile(tpl_payment);

    function PageView(options) {
        var that = this;
        View.apply(this, arguments);
        this.options = options;

        // create the layout
        this.layout = new HeaderFooterLayout({
            headerSize: App.Defaults.Header.size,
            footerSize: App.Defaults.Footer.size
        });

        this.WizardOptionsKey = 'EmailAddSummaryOptions';

        if(!this.options.App.Cache[this.WizardOptionsKey]){
            console.error('Missing this.WizardOptionsKey');
            App.history.navigate(App.Credentials.home_route);
            return;
        }

        // Add to new ".passed" params, separate from this.options.App and other root-level arguments/objects
        this.options.passed = _.extend({}, App.Cache[this.WizardOptionsKey] || {});
        
        this.loadModels();

        this.createHeader();
        this.createContent();

        // Updates content based on this.summary values
        this.update_content();

        this.add(this.layout);
    }

    PageView.prototype = Object.create(View.prototype);
    PageView.prototype.constructor = PageView;

    PageView.prototype.loadModels = function(){
        var that = this;

        // Models
        this.model = new EmailModel.Email();

        // default occasion/context
        this.contextTitleDefault = '(Name of Item)';
        this.contextTitle = this.contextTitleDefault + '';
        this.contextDetails = '';
        this.images = {};

        this.email_images_uploading = 0;

    };

    PageView.prototype.createHeader = function(){
        var that = this;

        // Icons

        // -- create
        this.headerContent = new View();
        // - done
        this.headerContent.Cancel = new Surface({
            content: '<i class="icon ion-ios7-close-outline"></i>',
            size: [60, undefined],
            classes: ['header-tab-icon-text-big']
        });
        this.headerContent.Cancel.on('click', function(){
            that.options.passed.on_cancel();
        });

        this.header = new StandardHeader({
            content: 'Compose',
            classes: ["normal-header"],
            backContent: false,
            backClasses: ["normal-header"],
            moreClasses: ["normal-header"],
            moreSurfaces: [
                this.headerContent.Cancel
            ]
        }); 
        this.header._eventOutput.on('back',function(){
            // App.history.back();
            // that.options.passed.on_cancel();
        });
        // this.header._eventOutput.on('more',function(){
        // });
        this.header.navBar.title.on('click',function(){
            // App.history.back();
            // that.options.passed.on_cancel();
        });
        this._eventOutput.on('inOutTransition', function(args){
            this.header.inOutTransition.apply(that.header, args);
        })

        this.layout.header.add(Utils.usePlane('header')).add(this.header);
    };

    PageView.prototype.createContent = function(){
        var that = this;

        // // create the scrollView of content
        // this.contentScrollView = new ScrollView(); //(App.Defaults.ScrollView);
        // this.contentScrollView.Views = [];

        // FlexibleLayout
        this.contentLayout = new FlexibleLayout({
            direction: 1, // vertical
            ratios: [1,true,1,true] // 1,true,1,true
        });
        this.contentLayout.Views = [];

        // this.form = new FormHelper({
        //     type: 'form',
        //     scroll: true
        // });

        // Add surfaces
        this.addSurfaces();

        this.contentLayout.sequenceFrom(this.contentLayout.Views);

        // this.contentScrollView.sequenceFrom(this.contentScrollView.Views);
        
        // Content
        this.layout.content.StateModifier = new StateModifier();
        // this.contentView = new View();
        // this.contentView.SizeMod = new Modifier({
        //     size: //[window.innerWidth - 50, true]
        //         function(){
        //             var tmpSize = that.contentScrollView.getSize(true);
        //             if(!tmpSize){
        //                 return [window.innerWidth, undefined];
        //             }
        //             return [window.innerWidth - 16, tmpSize[1]];
        //         }
        // });
        // this.contentView.OriginMod = new StateModifier({
        //     // origin: [0.5, 0.5]
        // });
        // this.contentView.add(this.contentView.OriginMod).add(this.contentView.SizeMod).add(this.contentScrollView);
        this.layout.content.add(this.layout.content.StateModifier).add(Utils.usePlane('content')).add(this.contentLayout); //.add(this.contentView);

    };

    PageView.prototype.addSurfaces = function() {
        var that = this;

        // this.allInputs = []; // array for adding to the _formScrollView

        // Build Surfaces
        // - add to scrollView

        // 1px line necessary?
        // var _holder = new Surface({size: [undefined,1]});
        // _holder.pipe(this.contentScrollView);
        // // need to create a 1px-height surface for the scrollview, otherwise it fucks up?
        // this.contentScrollView.Views.push(_holder);
        
        // this.createGroupView();
        this.createTopBar();
        this.createSpacer1();
        this.createImageView('image1');
        // this.createSpacer2();
        // this.createImageView('image2');
        this.createBottomBar();

        // this.addTimeframeSlider();

        // // weight
        // this.weightView = new View();
        // this.weightView.Surface = new Surface({
        //     content: '<div>Images</div><div>&nbsp;</div>',
        //     size: [undefined, true],
        //     classes: ['email-add-summary-topic-default','next-option']
        // });
        // this.weightView.Surface.on('click', function(){
        //     that.options.passed.on_choose('weight');
        // });
        // this.weightView.getSize = function(){
        //     return that.weightView.Surface.getSize(true);
        // };
        // this.weightView.add(this.weightView.Surface);
        // this.contentScrollView.Views.push(this.weightView);

        // // comments
        // this.commentsView = new View();
        // this.commentsView.Surface = new Surface({
        //     content: '<div>Images</div><div>&nbsp;</div>',
        //     size: [undefined, true],
        //     classes: ['email-add-summary-topic-default','next-option']
        // });
        // this.commentsView.Surface.on('click', function(){
        //     that.options.passed.on_choose('comments');
        // });
        // this.commentsView.getSize = function(){
        //     return that.commentsView.Surface.getSize(true);
        // };
        // this.commentsView.add(this.commentsView.Surface);
        // this.contentScrollView.Views.push(this.commentsView);

        // this.createPaymentView();

        // this.createSubmitButton();

        // // Submit button
        // this.submitButtonSurface = new Surface({
        //     content: 'Add to Wishlist',
        //     wrap: '<div class="outward-button"></div>',
        //     size: [undefined,60],
        //     classes: ['button-outwards-default']
        // });
        // this.submitButtonSurface.pipe(this.contentScrollView);
        // this.contentScrollView.Views.push(this.submitButtonSurface);

        // // Events for surfaces
        // this.submitButtonSurface.on('click', this.save_email.bind(this));

        // this.form.addInputsToForm(this.allInputs);

        // // Default selections
        // this.singleOrTeamView.TabBar.select('singles');
        // this.winOrPlaceView.TabBar.select('wlt');

    };

    PageView.prototype.createImageView = function(imageNumber){
        var that = this;

        if(!App.Data.usePg){

            var tmpView = new LayoutBuilder({
                controller: {
                    Views: [{
                        surface: {
                            key: 'NoUploads',
                            mods: [{
                                size: [undefined, undefined]
                            },{
                                origin: [0.5,0.5],
                                align: [0.5,0.5]
                            }],
                            surface: new Surface({
                                content: 'Download the Android or iOS app<br />to enable Photos!',
                                size: [undefined, true],
                                classes: ['email-add-image-holder-nouploads']
                            })
                        }
                    }],
                    events: function(elem){
                        elem.show(elem.NoUploads.NodeWithMods);
                    }
                }
            });

            this.images[imageNumber] = tmpView;

            this.contentLayout.Views.push(tmpView);

            return;
        }

        var tmpView = new View();

        tmpView.layout = new LayoutBuilder({
            flexible: {
                direction: 0,
                ratios: [true, 1],
                sequenceFrom: [{
                    surface: {
                        // Should be part of a RenderController and switch between:
                        // - Need to upload an image
                        // - Upload in Progress
                        // - Edit this image (crop, etc.)
                        key: 'Image',
                        mods: [
                        {
                            // size: 'square', 
                            size: function(){ // outSize
                                var maxWidth = window.innerWidth - 80,
                                    sizer = tmpView.layout.flexible.Image.sizer[0],
                                    tmpSize = sizer && sizer.getSize ? sizer.getSize(true) : 0,
                                    useSize = 0;
                                if(!tmpSize){
                                    return [undefined, undefined];
                                }
                                useSize = tmpSize[1];
                                if(useSize > maxWidth){
                                    useSize = maxWidth;
                                }
                                return [useSize, undefined];
                            }
                        },
                        'sizer', // referenced by index (of slider #, not the index in the array!)
                        {
                            origin: function(){
                                return [0.5,0.5];
                            },
                            align: [0.5,0.5]
                        }],
                        surface: new Surface({
                            content: '<div>Choose <strong>Picture '+imageNumber.substr(-1)+'</strong> <i class="icon ion-ios7-arrow-thin-right"></i></div>',
                            size: [undefined, true], 
                            classes: ['email-add-image-holder','empty-no-image']

                        }),
                        // surface: new VideoSurface({
                        //     content: '',
                        //     size: [undefined, 150], 
                        //     // classes: ['email-add-image-holder','empty-no-image']
                        //     autoplay: true,
                        // }),
                        events: function(){
                            // var thatSurface = this.surface;
                            // navigator.getUserMedia = (navigator.getUserMedia || 
                            //                          navigator.webkitGetUserMedia || 
                            //                          navigator.mozGetUserMedia || 
                            //                          navigator.msGetUserMedia);
                            // if (navigator.getUserMedia) {
                            //   // Request access to video only
                            //   navigator.getUserMedia(
                            //      {
                            //         video:true,
                            //         audio:false
                            //      },        
                            //      function(stream) {

                            //         var v = thatSurface._currentTarget;
                            //         // console.log(v);

                            //         var url = window.URL || window.webkitURL;
                            //         console.log('URL', url);
                            //         v.src = url ? url.createObjectURL(stream) : stream;
                            //         // thatSurface.setContent(url);
                            //         v.play();
                            //      },
                            //      function(error) {
                            //         alert('Something went wrong. (error code ' + error.code + ')');
                            //         return;
                            //      }
                            //   );
                            // }
                            // else {
                            //   alert('Sorry, the browser you are using doesn\'t support getUserMedia');
                            //   return;
                            // }
                        },
                        deploy: function(){
                            tmpView.layout.flexible.updateRatios();
                        },
                        click: function(){
                            // Take picture
                            Utils.takePicture('camera', {saveToPhotoAlbum:true}, function(imageURI){
                                Timer.setTimeout(function(){
                                    tmpView.layout.flexible.Image.setClasses(['email-add-image-holder']);
                                    tmpView.layout.flexible.Image.setSize([undefined, undefined]);
                                    tmpView.layout.flexible.Image.setContent('<div class="taken"><img src="'+imageURI+'" width="100%;" /></div>');
                                    // tmpView.Surface.setContent('<div class="taken">Image Taken!</div>');
                                },250);
                                that.upload_email_image(imageURI, imageNumber);
                            }, function(message){
                                // failed taking a picture
                                console.log(message);
                                console.log(JSON.stringify(message));
                                Utils.Notification.Toast('Failed picture');
                            });

                        }
                    }
                },{
                    size: [undefined, undefined],
                    flexible: {
                        key: 'RightGrid',
                        direction: 1,
                        ratios: [1,1], // 1 col, 2 rows
                        // dimensions: [1,2],
                        sequenceFrom: [{
                            surface: {
                                key: 'TakePicture',
                                mods: [
                                    {
                                        size: [undefined, undefined] 
                                        // function(){ // square, outSize
                                        //     // console.log(tmpView.layout);
                                        //     var sizer = tmpView.layout.flexible.RightGrid.TakePicture.sizer[0];
                                        //     var tmpSize = sizer && sizer.getSize ? sizer.getSize(true) : null;
                                        //     if(!tmpSize){
                                        //         return [undefined, undefined];
                                        //     }
                                        //     return [undefined, undefined];
                                        // }
                                    },
                                    'sizer', // referenced by index (of slider #, not the index in the array!)
                                    {
                                        align: [0.5,0.5],
                                        origin: [0.5,0.5]
                                    }
                                ],
                                surface: new Surface({
                                    content: '<div class="not-taken"><i class="icon ion-camera"></i></div>',
                                    size: [undefined,true],
                                    classes: ['email-add-summary-take-picture']
                                }),
                                // deploy: function(){
                                //     tmpView.layout.flexible.updateRatios();
                                // },
                                click: function(){

                                    // Take picture
                                    Utils.takePicture('camera', {}, function(imageURI){
                                        Timer.setTimeout(function(){
                                            tmpView.layout.flexible.Image.setClasses(['email-add-image-holder']);
                                            tmpView.layout.flexible.Image.setSize([undefined, undefined]);
                                            tmpView.layout.flexible.Image.setContent('<div class="taken"><img src="'+imageURI+'" width="100%;" /></div>');
                                            // tmpView.Surface.setContent('<div class="taken">Image Taken!</div>');
                                        },250);
                                        that.upload_email_image(imageURI, imageNumber);
                                    }, function(message){
                                        // failed taking a picture
                                        console.log(message);
                                        console.log(JSON.stringify(message));
                                        Utils.Notification.Toast('Failed picture');
                                    });

                                }
                            }
                        },{
                            surface: {
                                key: 'Gallery',
                                mods: [
                                    {
                                        size: [undefined, undefined] 
                                        // size: function(){ // square, outSize
                                        //     // console.log(tmpView.layout);
                                        //     var sizer = tmpView.layout.flexible.RightGrid.Gallery.sizer[0];
                                        //     var tmpSize = sizer && sizer.getSize ? sizer.getSize(true) : null;
                                        //     if(!tmpSize){
                                        //         return [undefined, undefined];
                                        //     }
                                        //     return [tmpSize[1], undefined];
                                        // }
                                    },
                                    'sizer', // referenced by index (of slider #, not the index in the array!)
                                    {
                                        align: [0.5,0.5],
                                        origin: [0.5,0.5]
                                    }
                                ],
                                surface: new Surface({
                                    content: '<div class="not-taken"><i class="icon ion-images"></i></div>',
                                    size: [undefined, true],
                                    classes: ['email-add-summary-take-picture']
                                }),
                                // deploy: function(){
                                //     tmpView.layout.flexible.updateRatios();
                                // },
                                click: function(){
                                    // tmpView.TakePictureSurface.emit('click');

                                        // Take picture
                                        Utils.takePicture('gallery', {}, function(imageURI){
                                            Timer.setTimeout(function(){
                                                tmpView.layout.flexible.Image.setClasses(['email-add-image-holder']);
                                                tmpView.layout.flexible.Image.setSize([undefined, undefined]);
                                                tmpView.layout.flexible.Image.setContent('<div class="taken"><img src="'+imageURI+'" width="100%;" /></div>');
                                                // tmpView.Surface.setContent('<div class="taken">Image Taken!</div>');
                                            },250);
                                            that.upload_email_image(imageURI, imageNumber);
                                        }, function(message){
                                            // failed taking a picture
                                            console.log(message);
                                            console.log(JSON.stringify(message));
                                            Utils.Notification.Toast('Failed picture');
                                        });

                                }
                            }
                        },
                        // {

                        //     surface: {
                        //         key: 'Closet',
                        //         mods: [
                        //             {
                        //                 size: [undefined, undefined] 
                        //                 // size: function(){ // square, outSize
                        //                 //     // console.log(tmpView.layout);
                        //                 //     var sizer = tmpView.layout.flexible.RightGrid.Gallery.sizer[0];
                        //                 //     var tmpSize = sizer && sizer.getSize ? sizer.getSize(true) : null;
                        //                 //     if(!tmpSize){
                        //                 //         return [undefined, undefined];
                        //                 //     }
                        //                 //     return [tmpSize[1], undefined];
                        //                 // }
                        //             },
                        //             'sizer', // referenced by index (of slider #, not the index in the array!)
                        //             {
                        //                 align: [0.5,0.5],
                        //                 origin: [0.5,0.5]
                        //             }
                        //         ],
                        //         surface: new Surface({
                        //             content: '<div class="not-taken"><i class="icon ion-bag"></i></div>',
                        //             size: [undefined, true],
                        //             classes: ['email-add-summary-take-picture']
                        //         }),
                        //         // deploy: function(){
                        //         //     tmpView.layout.flexible.updateRatios();
                        //         // },
                        //         click: function(){
                        //             // tmpView.TakePictureSurface.emit('click');

                        //             Utils.Popover.Alert('Your stored Wardrobe is not yet available','OK');

                        //         }
                        //     }
                        // }
                        ]
                    }
                }]
            }

        });

        // Timer.setTimeout(function(){


        //     tmpView.layout.flexible.Image.setClasses(['email-add-image-holder']);
        //     tmpView.layout.flexible.Image.setContent('<div class="taken"><img src="icon_1024.png" width="100%;" /></div>');
        //     // tmpView.layout.flexible.Image.setSize([undefined, 200]); 
        //     // tmpView.layout.flexible.updateRatios();

        //     console.log(tmpView.layout);

        // },2000);

        // tmpView.GallerySurface.on('click', function(){
        //     // Take picture
        //     Utils.takePicture('gallery', {}, function(imageURI){
        //         Timer.setTimeout(function(){
        //             tmpView.layout.flexible.Image.setContent('<div class="taken"><img src="'+imageURI+'" height="100%;" /></div>');
        //             // tmpView.Surface.setContent('<div class="taken">Image Taken!</div>');
        //         },1000);
        //         that.upload_email_image(imageURI, imageNumber);
        //     }, function(message){
        //         // failed taking a picture
        //         console.log(message);
        //         console.log(JSON.stringify(message));
        //         Utils.Notification.Toast('Failed picture');
        //     });

        // });


        // tmpView.getSize = function(){
        //     return tmpView.Surface.getSize();
        // };
        var outerSize = new StateModifier({
            size: [undefined, undefined]
        });
        var originMod = new StateModifier({
            origin: [0, 0.5],
            align: [0.5,0.5]
        });
        // tmpView.add(outerSize).add(originMod).add(tmpView.Surface);
        tmpView.add(tmpView.layout.flexible);

        this.images[imageNumber] = tmpView;

        this.contentLayout.Views.push(tmpView);

    };

    PageView.prototype.createSpacer1 = function(imageNumber){
        var that = this;


        this.MainSpacer1 = new Surface({
            content: '',
            size: [undefined, 2],
            classes: [],
            properties: {
                background: '#ddd'
            }
        });

        this.contentLayout.Views.push(this.MainSpacer1);


    };

    PageView.prototype.createSpacer2 = function(imageNumber){
        var that = this;


        this.MainSpacer2 = new Surface({
            content: '',
            size: [undefined, 2],
            classes: [],
            properties: {
                background: '#ddd'
            }
        });

        this.contentLayout.Views.push(this.MainSpacer2);


    };


    PageView.prototype.createTopBar = function(){
        var that = this;

        this.topBar = new View();
        this.topBar.SizeMod = new Modifier({
            size: function(){
                return [undefined, 200];
            }
        });

        // new FormHelper({
        //     type: 'form',
        //     scroll: true,
        //     size: [undefined, undefined]
        // });

        this.topBar.input = new FormHelper({

            // margins: [10,10],

            size: [undefined, undefined],

            // form: that.topBar,
            name: 'something',
            placeholder: 'Type details here',
            type: 'textarea',
            value: '',
            properties: {
                background: 'none',
                border: '0px',
                padding: '20px 10px'
            }
        });

        this.topBar.add(this.topBar.SizeMod).add(this.topBar.input);

        // this.topBar.addInputsToForm([this.topBar.input]);

        // this.topBar = new Surface({
        //     content: this.contextTitle,
        //     size: [undefined, true],
        //     // wrap: '<div class="ellipsis-all"></div>',
        //     classes: ['email-add-summary-details','ellipsis-all']
        // });
        // this.topBar.on('click', function(){

        //     Utils.Popover.Prompt('Wish details::', that.contextTitle, 'OK','Undo','text','placeholder here')
        //     .then(function(txt){
        //         if(txt){

        //             // Check the invite code against the server
        //             // - creates the necessary relationship also
        //             that.contextTitle = txt;
        //             that.topBar.setContent(that.contextTitle);
        //         }
        //     });

        // });

        this.contentLayout.Views.push(this.topBar);

    };


    PageView.prototype.createBottomBar = function(){
        var that = this;

        this.bottomBar = new Surface({
            content: 'Add to Wishlist',
            wrap: '<div class="outward-button"></div>',
            size: [undefined, 60],
            classes: ['button-outwards-default']
        });
        this.bottomBar.default = 'Add to Wishlist';
        this.bottomBar.on('click', that.save_email.bind(this));

        this.submitButton = this.bottomBar;

        this.contentLayout.Views.push(this.bottomBar);

    };


    PageView.prototype.createBottomBar_old = function(){
        var that = this;

        this.bottomBar = new LayoutBuilder({
            size: [undefined, 60],
            flexible: {
                direction: 0,
                ratios: [true, 1], // true, 1
                sequenceFrom: [{
                    surface: {
                        key: 'Occasion',
                        surface: new Surface({
                            content: '<i class="icon ion-android-more"></i>',
                            wrap: '<div class="outward-button"></div>',
                            size: [80, undefined],
                            classes: ['button-outwards-default']
                        }),
                        click: function(){
                                        
                            Utils.Popover.Prompt('Name of thing:', that.contextTitle, 'OK','Undo')
                            .then(function(txt){
                                if(txt){

                                    // Check the invite code against the server
                                    // - creates the necessary relationship also
                                    that.contextTitle = txt;

                                }
                            });
                        }
                    }
                },{
                    surface: {
                        key: 'SubmitButton',
                        surface: new Surface({
                            content: 'Add to Wishlist',
                            wrap: '<div class="outward-button"></div>',
                            size: [undefined, undefined],
                            classes: ['button-outwards-default']
                        }),
                        click: function(){
                            that.save_email();
                        }
                    }
                }]
            }
        });

        this.submitButton = this.bottomBar.flexible.SubmitButton;

        this.contentLayout.Views.push(this.bottomBar);

    };

    PageView.prototype.upload_email_image = function(imageURI, imageNumber){
        var that = this;

        // Utils.Notification.Toast('Preparing Photo and Uploading');

        console.log('uploading...');
        console.log(this.player_id);
        console.log({
            token : App.Data.UserToken,
            extra: {
                "description": "Uploaded from my phone testing 234970897"
            }
        });

        this.submitButton.setContent('Uploading Photo');

        this.email_images_uploading += 1;

        var ft = new FileTransfer(),
            options = new FileUploadOptions();

        options.fileKey = "file";
        options.fileName = 'filename.jpg'; // We will use the name auto-generated by Node at the server side.
        options.mimeType = "image/jpeg";
        options.chunkedMode = false;
        options.params = {
            token : App.Data.UserToken,
            // player_id : this.player_id,
            extra: {
                "description": "Uploaded from my phone testing 293048"
            }
        };

        ft.onprogress = function(progressEvent) {
            
            if (progressEvent.lengthComputable) {
                // loadingStatus.setPercentage(progressEvent.loaded / progressEvent.total);
                // console.log('Percent:');
                // console.log(progressEvent.loaded);
                // console.log(progressEvent.total);
                console.log((progressEvent.loaded / progressEvent.total) * 100);
                // Utils.Notification.Toast((Math.floor((progressEvent.loaded / progressEvent.total) * 1000) / 10).toString() + '%');
            } else {
                // Not sure what is going on here...
                // loadingStatus.increment();
                console.log('not computable?, increment');
            }
        };
        ft.upload(imageURI, Credentials.server_root + "media/emailphoto",
            function (r) {

                that.email_images_uploading -= 1;
                that.submitButton.setContent(that.submitButton.default);

                // getFeed();
                // alert('complete');
                // alert('upload succeeded');
                // Utils.Notification.Toast('Photo is Ready');
                // Utils.Notification.Toast('About 10 seconds to process');

                // r.responseCode
                var response = JSON.parse(r.response);

                // Expecting to get back a media_id that we'll use for uploading the Email/Pickup

                if(response._id){
                    // Utils.Notification.Toast(response._id);
                    that.images[imageNumber]._id = response._id;
                }

                // // update collection
                // Timer.setTimeout(function(){
                //     that.model.fetch();
                // },5000);

            },
            function (e) {
                that.email_images_uploading -= 1;
                console.error(e);
                Utils.Notification.Toast('Upload failed');
            }, options);
    };

    PageView.prototype.update_content = function() {
        var that = this;

        this.summary = App.Cache[this.WizardOptionsKey].summary;
        this.AllowedRoutes = {
            images : true,
            location: true,
            weight: true,
            comment: true,
            payment: true
        };

        // // Images
        // if(this.summary.images){
        //     this.imagesView.Surface.setContent('<div>Images</div><div><span class="ellipsis-all">'+ 'images' +'</span></div>');
            
        //     // Allow the next one to be displayed
        //     this.AllowedRoutes.players = true;
        //     this.AllowedRoutes.teams = true;

        // } else {
        //     this.imagesView.Surface.setContent('<div>Images</div><div>Choose Images</div>');
        // }



        // // Group Name
        // if(!this.options.passed.summary.group.get('name')){
        //     this.groupView.Surface.setContent('');
        // } else {
        //     this.groupView.Surface.setContent('<div class="no-location">'+S(this.options.passed.summary.group.get('name'))+'</div>');
        // }

        // // Detail
        // if(this.summary.detail){
        //     this.detailView.Surface.setContent(template_detail(this.summary));
        // } else {
        //     this.detailView.Surface.setContent('<div class="no-location"><i class="icon ion-information-circled"></i></div>');
        // }

        // // Payment method
        // if(this.summary.payment){
        //     this.paymentView.Surface.setContent(template_payment(this.summary));
        // } else {
        //     this.paymentView.Surface.setContent('<div class="no-payment"><i class="icon ion-card"></i></div>');
        // }

        // // Teams
        // if(this.summary.SingleOrTeam == 'singles'){
        //     // No Teams to show
        //     this.TeamsView.Surface.setContent('');
        // } else {
        //     if(this.AllowedRoutes.teams && this.summary.team_results && this.summary.team_results != {}){
        //         this.TeamsView.Surface.setClasses(['email-add-summary-topic-default','next-option']);
        //         this.TeamsView.Surface.setContent('<div>Teams</div><div><span class="ellipsis-all">'+ Object.keys(this.summary.team_results).length +' Teams</span></div>');

        //         // Allow the next one to be displayed
        //         this.AllowedRoutes.result = true;
        //     } else {
        //         if(this.AllowedRoutes.teams) {
        //             this.TeamsView.Surface.setClasses(['email-add-summary-topic-default','next-option']);
        //         } else {
        //             this.TeamsView.Surface.setClasses(['email-add-summary-topic-default']);
        //         }
        //         this.TeamsView.Surface.setContent('<div>Teams</div><div>Select Teams</div>');
        //     }
        // }

        // // Players
        // if(this.AllowedRoutes.players && this.summary.player_results && Object.keys(this.summary.player_results).length > 0){
        //     this.playersView.Surface.setClasses(['email-add-summary-topic-default','next-option']);
        //     // say if it also incudes me?
        //     this.playersView.Surface.setContent('<div>Players</div><div><span class="ellipsis-all">'+ Object.keys(this.summary.player_results).length +' Players</span></div>');

        //     // Allow the next one to be displayed
        //     this.AllowedRoutes.result = true;
        //     // console.log(this.summary);
        //     // debugger;
        // } else {
        //     if(this.AllowedRoutes.players) {
        //         this.playersView.Surface.setClasses(['email-add-summary-topic-default','next-option']);
        //     } else {
        //         this.playersView.Surface.setClasses(['email-add-summary-topic-default']);
        //     }
        //     this.playersView.Surface.setContent('<div>Players</div><div>Select Players</div>');
        // }

        // // Results (checkmark)
        // if(this.AllowedRoutes.result && this.summary.result){
        //     this.resultView.Surface.setClasses(['email-add-summary-topic-default','next-option']);
        //     this.resultView.Surface.setContent('<div>Result</div><div><span class="ellipsis-all"> <i class="icon ion-checkmark-circled"></i> </span></div>');
        // } else {
        //     if(this.AllowedRoutes.result) {
        //         this.resultView.Surface.setClasses(['email-add-summary-topic-default','next-option']);
        //     } else {
        //         this.resultView.Surface.setClasses(['email-add-summary-topic-default']);
        //     }
        //     this.resultView.Surface.setContent('<div>Result</div><div>Add Results</div>');
        // }



    };

    PageView.prototype.save_email = function(ev){
        var that = this;

        if(this.checking === true){
            // return;
        }

        var formData = {};

        // Determine what data, and format, we'll send up to the server to store this Email
        // formData.images = this.summary.images;

        // // picture (only taking one for now)
        // if(!this.summary.media_id){
        //     Utils.Notification.Toast('Include a picture!');
        //     return;
        // }
        // formData.images = [this.summary.media_id];

        // // title
        // formData.title = this._inputs['title'].getValue().toString();
        // if(!formData.title){
        //     Utils.Notification.Toast('Include a title!');
        //     return;
        // }

        console.log(that.images);

        formData.images = [];

        if(that.email_images_uploading){
            Utils.Popover.Alert('Please allow a moment for the image to upload, then try again','OK');
            return;
        }

        // images
        if(!that.images['image1'] || !that.images['image1']._id){
            // Utils.Notification.Toast('No Picture 1');
            // return;
        } else {
            formData.images.push( that.images['image1']._id );
        }
        // if(!that.images['image2'] || !that.images['image2']._id){
        //     Utils.Notification.Toast('No Picture 2');
        //     return;
        // }

        
        // detail/description
        formData.title = this.topBar.input.getValue().toString();
        formData.details = that.contextDetails;

        // timeframe
        // - email...v2 (trying to limit the number of extra options) (maybe have a + sign to expand advanced options?)

        // // Group_id
        // formData.group_id = this.summary.group.get('_id');

        // // payment
        // if(!this.summary.payment){
        //     Utils.Notification.Toast('Include a payment method!');
        //     return;
        // }
        // formData.payment_source_id = this.summary.payment._id;

        this.submitButton.setContent('One sec...');

        // Get elements to save
        this.model.set(formData);

        this.checking = true;
        this.model.save()
            .fail(function(){
    
                that.checking = false;
                that.submitButton.setContent('Create and Share <i class="icon ion-ios7-arrow-thin-right"></i>');                

            })
            .then(function(newModel){

                // that.checking = false;
                // that.submitButtonSurface.setContent('Create Email');

                Utils.Notification.Toast('Saved Email OK!');

                // Create the new one
                // - causes a "populated" to be created that is valid
                var newEmail = new EmailModel.Email(newModel);

                // have to clear it for some reason!?!?
                that.topBar.input.Surface.setContent('');

                // Clear player cache
                // - email...

                // // Clear history
                // App.history.eraseUntilTag('StartAdd');
                // // Redirect to the new Email
                // App.history.navigate('email/share/' + newModel._id);


                // Redirect to the new Email
                App.history.backTo('StartAdd');

            });

        return false;
    };

    PageView.prototype.launch_popover_team_with_ind = function(){
        var that = this;

        App.Cache.HelpPopoverModal = {
            title: 'Team + Individual',
            body: "You can now include results for both the team, and the individuals", // could even pass a surface!?!?
            on_done: function(){
                App.history.navigate('random2',{history: false});
            }
        };
        // navigate
        App.history.navigate('modal/helppopover', {history: false});

    };

    PageView.prototype.backbuttonHandler = function(showing){
        this.options.passed.on_cancel();
    };

    PageView.prototype.keyboardHandler = function(showing){
        var that = this;

        if(showing){
            this.contentLayout.setRatios([1]);
        } else {
            this.contentLayout.setRatios([1,true,1,true]);
        }

    }

    PageView.prototype.inOutTransition = function(direction, otherViewName, transitionOptions, delayShowing, otherView, goingBack){
        var that = this;

        this._eventOutput.emit('inOutTransition', arguments);

        switch(direction){
            case 'hiding':
                switch(otherViewName){

                    default:
                        // Overwriting and using default identity
                        transitionOptions.outTransform = Transform.identity;

                        // Content
                        Timer.setTimeout(function(){

                            // Opacity 0
                            that.layout.content.StateModifier.setOpacity(0, transitionOptions.inTransition);

                        }, 1);

                        break;
                }

                break;
            case 'showing':

                if(this._refreshData){
                    // Timer.setTimeout(this.refreshData.bind(this), 1000);

                    // Run the "update"
                    this.update_content();

                }
                this._refreshData = true;
                switch(otherViewName){

                    default:

                        // No animation by default
                        transitionOptions.inTransform = Transform.identity;

                        that.layout.content.StateModifier.setTransform(Transform.translate(0,window.innerHeight * -1.5,0));
                        // that.contentScrollView.Views.forEach(function(surf, index){
                        //     surf.StateModifier.setTransform(Transform.translate(0,window.innerHeight,0));
                        // });

                        // Content
                        // - extra delay for other content to be gone
                        Timer.setTimeout(function(){

                            that.layout.content.StateModifier.setTransform(Transform.translate(0,0,0),{
                                duration: 450,
                                curve: Easing.outSine
                            });


                        }, delayShowing +transitionOptions.outTransition.duration);


                        break;
                }
                break;
        }
        
        return transitionOptions;
    };




    PageView.DEFAULT_OPTIONS = {
        header: {
            size: [undefined, 50]
        },
        footer: {
            size: [undefined, 0]
        },
        content: {
            size: [undefined, undefined]
        }
    };

    module.exports = PageView;

});
