
define(function(require, exports, module) {

    var Engine = require('famous/core/Engine');
    var View = require('famous/core/View');
    var ScrollView = require('famous/views/Scrollview');
    var SequentialLayout = require('famous/views/SequentialLayout');
    var Lightbox = require('famous/views/Lightbox');
    var RenderController = require('famous/views/RenderController');
    var FlexibleLayout = require('famous/views/FlexibleLayout');
    var Surface = require('famous/core/Surface');
    var ImageSurface = require('famous/surfaces/ImageSurface');
    var Modifier = require('famous/core/Modifier');
    var StateModifier = require('famous/modifiers/StateModifier');
    var Transitionable     = require('famous/transitions/Transitionable');
    var Transform = require('famous/core/Transform');
    var Matrix = require('famous/core/Transform');
    var RenderNode         = require('famous/core/RenderNode')

    var Utility = require('famous/utilities/Utility');
    var Timer = require('famous/utilities/Timer');

    var HeaderFooterLayout = require('famous/views/HeaderFooterLayout');

    var TabBar = require('famous/widgets/TabBar');
    var NavigationBar = require('famous/widgets/NavigationBar');
    var GridLayout = require("famous/views/GridLayout");

    var EventHandler = require('famous/core/EventHandler');

    var $ = require('jquery');
    var Credentials = JSON.parse(require('text!credentials.json'));

    // Views
    var StandardHeader = require('views/common/StandardHeader');
    var StandardTabBar = require('views/common/StandardTabBar');
    var SmartSurface = require('views/common/SmartSurface');
    var LayoutBuilder = require('views/common/LayoutBuilder');

    var ThreadEmailListView = require('./Subviews/EmailList');

    // Extras
    var Utils = require('utils');
    var _ = require('underscore');
    var numeral = require('lib2/numeral.min');
    var crypto = require('lib2/crypto');

    // Models
    // var InvoiceModel = require('models/invoice');
    var ThreadModel = require('models/thread');
    // var ContestVoteModel = require('models/contest_vote');
    // var ContestContentModel = require('models/contest_content');

    // Subviews

    // // ContestContent
    // var ContestContentView      = require('./Subviews/ContestContent');

    // // Game story/chat
    // var GameStoryListView      = require('views/Game/Subviews/GameStoryList');

    // // Game Sharing
    // var GameShareView      = require('views/Game/Subviews/GameShare');

    // // Game Media (unused atm)
    // var PlayerGameListView      = require('views/Player/PlayerGameList');

    // // Media Blocks
    // var PlayerMediaBlocksView      = require('views/Player/PlayerMediaBlocks');

    function PageView(options) {
        var that = this;
        View.apply(this, arguments);
        this.options = options;

        this.thread_id = that.options.args[0];
        this._subviews = [];
        this.loadModels();

        // create the layout
        this.layout = new HeaderFooterLayout({
            headerSize: App.Defaults.Header.size,
            footerSize: App.Defaults.Footer.size
        });

        this.createContent();
        this.createHeader();
        
        // Attach the main transform and the comboNode to the renderTree
        this.add(this.layout);

        this.afterModels();


    }

    PageView.prototype = Object.create(View.prototype);
    PageView.prototype.constructor = PageView;
    
    PageView.prototype.loadModels = function(){
        var that = this;

        // Models
        this.model = new ThreadModel.Thread({
            _id: this.thread_id
        });
        this.model.fetch({prefill: true});


        // this._onRemoteRefresh = [];
        // this._onRemoteRefresh.push(this.model);

    };

    PageView.prototype.afterModels = function(){
        var that = this;

        console.log(this.model);
        console.log(this.model.populated);
        this.model.populated().then(function(){

            // Get related Emails for Thread
            that.model._related.Email.populated().then(function(){
                // console.log(this);
                // console.log(that.model._related.Email.toJSON());
                // console.log(that.model);
                that.header.navBar.title.setContent(that.model._related.Email.length+ ' email'+(that.model._related.Email.length === 1 ? '':'s')+' in thread' );

                // that.addEmails();
                // debugger;
            });
            that.model.fetchRelated();

            // // debugger;
            // that.createDetailContent();
            // that.DetailController.show(that.DetailView);

            // Show user information
            that.contentLightbox.show(that.PageLayout);
            console.log(that.PageLayout.Views);


            // // update going forward
            // that.update_content();
            // that.model.on('change', that.update_content.bind(that));
            // that.vote_model.populated().then(function(){
            //     that.vote_model.hasFetched = true;
            //     that.update_content();
            //     that.vote_model.on('change', that.update_content.bind(that));
            // });

        });

    };

    PageView.prototype.createHeader = function(){
        var that = this;
        
        // Icons

        // -- settings/message (lightbox)
        this.headerContent = new View();

        // Share (details)

        this.headerContent.ShareLinkController = new RenderController();
        this.headerContent.ShareLinkController.getSize = function(){
            return [60,undefined];
        };

        this.headerContent.ShareLink = new Surface({
            content: '<i class="icon ion-share"></i>',
            size: [60, undefined],
            classes: ['header-tab-icon-text-big']
        });
        this.headerContent.ShareLink.on('longtap', function(){
            Utils.Help('Contest/View/Menu');
        });
        this.headerContent.ShareLink.on('click', function(){
            App.history.navigate('contest/share/' + that.contest_id);
        });


        // Menu

        this.headerContent.MenuController = new RenderController();
        this.headerContent.MenuController.getSize = function(){
            return [60,undefined];
        };

        this.headerContent.Menu = new Surface({
            content: '<i class="icon ion-navicon-round"></i>',
            size: [60, undefined],
            classes: ['header-tab-icon-text-big']
        });
        this.headerContent.Menu.on('longtap', function(){
            Utils.Help('Contest/View/Menu');
        });
        this.headerContent.Menu.on('click', function(){

            Utils.Popover.Buttons({
                title: 'Additional Options',
                buttons: [
                // {
                //     text: 'Share',
                //     success: function(){
                //         App.history.navigate('contest/share/' + that.contest_id);
                //     }
                // },
                {
                    text: 'Delete Choice',
                    success: function(){

                        // Utils.Popover.Alert('Not functioning','OK');
                        // return;

                        Utils.Notification.Toast('Deleting Choice');

                        var data = {
                            active: false
                        }

                        // that.headerContent.Menu.setContent('<i class="icon ion-ios7-checkmark"></i>');
                        // that.headerContent.Menu.setClasses(['header-tab-icon-text-big','marked-complete']);

                        App.history.back();

                        that.model.set(data);
                        that.model.save(data,{
                            patch: true,
                            // success: function(){
                            //     that.model.fetch();    
                            // }
                        })
                        .fail(function(){
                            console.error('Failed saving active=false');
                        })
                        .then(function(){
                            that.model.fetch();
                            // that.contestContent.collection.fetch();
                        });
                    }
                }]
            });

        });



        // create the header
        this.header = new StandardHeader({
            content: 'Thread', // no header title
            classes: ["normal-header"],
            backClasses: ["normal-header"],
            moreClasses: ["normal-header"],
            moreSurfaces: [
                this.headerContent.ShareLinkController,
                this.headerContent.MenuController
            ]
            // moreContent: false // '<span class="icon ion-refresh"></span>'
        }); 
        this.header._eventOutput.on('back',function(){
            App.history.back();
        });
        this.header.navBar.title.on('click',function(){
            App.history.back();
        });
        this._eventOutput.on('inOutTransition', function(args){
            this.header.inOutTransition.apply(this.header, args);
        })


        // Attach header to the layout        
        this.layout.header.add(Utils.usePlane('header')).add(this.header);

    };

    PageView.prototype.createContent = function(){
        var that = this;

        // create the content
        this.PageLayout = new LayoutBuilder({
            size: [undefined, undefined],
            scroller: {
                direction: 1, // vertical
                // ratios: [true, 1, true],
                sequenceFrom: []
            }
        });
        this.PageLayout.Views = [];
            
        this.DetailController = new RenderController({
            showingSize: true
        });
        // this.PageLayout.Views.push(this.DetailController);
        
        // this.createDetails();
        // this.createImageComparison();
        // this.createVotingBar(); // and Results
        this.createEmailList();
        // this.createContestVisibleVotes();

        this.PageLayout.scroller.sequenceFrom(this.PageLayout.Views);

        // Content state modifier
        this.ContentStateModifier = new StateModifier();

        // Content Lightbox
        // - waiting for the user to load a bit
        this.contentLightbox = new RenderController();
        // this.contentLightbox.getSize = function(){
        //     return 
        // }
        this.loadingUser = new View();
        this.loadingUser.StateModifier = new StateModifier({
            align: [0.5, 0.5],
            origin: [0.5, 0.5]
        });
        this.loadingUser.Surface = new Surface({
            content: '<i class="icon ion-loading-c"></i>',
            size: [true, true],
            properties: {
                fontSize: "40px",
                textAlign: "center",
                color: "#444",
                lineHeight: "50px"
            }
        });
        this.loadingUser.add(this.loadingUser.StateModifier).add(this.loadingUser.Surface);
        this.contentLightbox.show(this.loadingUser);

        // this.layout.content.add(this.ContentStateModifier).add(this.mainNode);
        this.layout.content.add(this.ContentStateModifier).add(this.contentLightbox);

    };

    PageView.prototype.createDetailContent = function(){
        var that = this;

        debugger;

        var Model = this.model;

        var contestView = new View(),
            name = Model.get('title') || '&nbsp;none';

        var visitContest = function(){
            // App.history.navigate('contest/' + Model.get('_id'));
        };

        contestView.Layout = new LayoutBuilder({
            sequential: {
                direction: 1,
                sequenceFrom: [{
                    surface: {
                        key: 'BottomSpacer',
                        surface: new Surface({
                            content: '<br /><br />',
                            size: [undefined, true],
                            classes: ['contest-list-item-bottomspacer']
                        }),
                        click: visitContest,
                        pipe: that.contentLayout
                    }
                },{
                    flexible: {
                        key: 'Top',
                        direction: 0,
                        ratios: [true,1],
                        size: [undefined, true],
                        sequenceFrom: [{
                            surface: {
                                key: 'User',
                                surface: new Surface({
                                    content: Model.get('user_id._id') == App.Data.User.get('_id') ? 'You' : Model.get('user_id.profile.name').substr(0,6),
                                    wrap: '<div class="ellipsis-all"></div>',
                                    size: [true, true],
                                    classes: ['contest-list-item-user'].concat(Model.get('user_id._id') == App.Data.User.get('_id') ? ['is-me']:[])
                                }),
                                click: visitContest,
                                pipe: that.contentLayout
                            }
                        },{
                            surface: {
                                key: 'Title',
                                surface: new Surface({
                                    content: Model.get('details.occasion'),
                                    size: [undefined, true],
                                    classes: ['contest-list-item-title']
                                }),
                                click: visitContest,
                                pipe: that.contentLayout
                            }
                        }]
                    }
                },{
                    surface: {
                        key: 'Datetime',
                        surface: new Surface({
                            content: moment(Model.get('created')).format('dd, MMM D'),
                            size: [undefined, true],
                            classes: ['contest-list-item-datetime']
                        }),
                        click: visitContest,
                        pipe: that.contentLayout
                    }
                },{

                    // Should have a RenderController here
                    // - wait for both images to load before showing them! 
                    flexible: {
                        key: 'Images',
                        direction: 0,
                        ratios: [1,1],
                        size: [undefined, true],
                        sequenceFrom: [[{
                            surface: {
                                key: 'Image1',
                                margins: [0,5,0,10],

                                mods: [{
                                    size: function(val){
                                        var w = contestView.Layout.sequential.Images.Image1.getSize(val)[0];
                                        // console.log(w);
                                        return [undefined, w];
                                    }
                                }],

                                surface: new ImageSurface({
                                    content: Model.get('images')[0].urls.thumb300x300,
                                    size: [undefined,undefined],
                                    classes: ['contest-list-item-image']
                                }),
                                click: visitContest,
                                pipe: that.contentLayout
                            }
                        },{
                            plane: [null,2],
                            surface: {
                                key: 'Image1Votes',
                                margins: [0,5,0,10],
                                mods: [{
                                    size: function(val){
                                        // get the rendered node size, not just the image size
                                        // - or if using margins (above), then get the Image1 size, I think
                                        return [undefined, contestView.Layout.sequential.Images.Image1.getSize(val)[0]];
                                    }
                                }],
                                surface: new Surface({
                                    content: function(){
                                        return Model.get('results')[Model.get('images')[0]._id];
                                    },
                                    wrap: '<div> <div></div></div>',
                                    size: [undefined, undefined],
                                    classes: ['contest-list-item-votes']
                                }),
                                events: function(node){
                                    var obj = this;
                                    Model.on('change', function(){
                                        obj.surface.updateContent();
                                    });
                                },
                                click: visitContest,
                                pipe: that.contentLayout
                            }
                        }],[{
                            surface: {
                                key: 'Image2',
                                margins: [0,10,0,5],
                                mods: [{
                                    size: function(val){
                                        var w = contestView.Layout.sequential.Images.Image2.getSize(val)[0];
                                        return [undefined, w];
                                    }
                                }],
                                surface: new ImageSurface({
                                    content: Model.get('images')[1].urls.thumb300x300,
                                    size: [undefined, undefined],
                                    classes: ['contest-list-item-image']
                                }),
                                click: visitContest,
                                pipe: that.contentLayout
                            }
                        },{
                            plane: [null,2],
                            surface: {
                                key: 'Image2Votes',
                                margins: [0,10,0,5],
                                mods: [{
                                    size: function(val){
                                        // get the rendered node size, not just the image size
                                        // - or if using margins (above), then get the Image2 size, I think
                                        return contestView.Layout.sequential.Images.Image2.getSize(val);
                                    }
                                }],
                                surface: new Surface({
                                    content: function(){
                                        return Model.get('results')[Model.get('images')[1]._id];
                                    },
                                    wrap: '<div> <div></div></div>',
                                    size: [undefined, undefined],
                                    classes: ['contest-list-item-votes']
                                }),
                                events: function(node){
                                    var obj = this;
                                    Model.on('change', function(){
                                        obj.surface.updateContent();
                                    });
                                },
                                click: visitContest,
                                pipe: that.contentLayout
                            }
                        }]]
                    }
                }]
            }
        });

        contestView.Layout.Model = Model;

        this.DetailView = contestView.Layout;

    };
// 
    PageView.prototype.createEmailList = function(){
        var that = this;

        // Content
        this.ThreadEmailList = new ThreadEmailListView({
            model: this.model
        });
        this._subviews.push(this.ThreadEmailList);
        this.ThreadEmailList.View = new View();
        this.ThreadEmailList.View.add(Utils.usePlane('content')).add(this.ThreadEmailList);
        // this.todoLayout.Layout.Views.push(this.ThreadEmailList.View);


        // // Sequence everything
        // this.todoLayout.Layout.sequenceFrom(this.todoLayout.Layout.Views);

        // this.todoLayout.add(this.todoLayout.Layout);

        this.PageLayout.Views.push(this.ThreadEmailList.View);

    };

    PageView.prototype.refreshData = function() {
        try {
            this.model.fetch();
            this.tabBar.Layout.Stories.GameStoryListView.collection.fetch();
        }catch(err){};
    };

    PageView.prototype.remoteRefresh = function(snapshot){
        var that = this;
        Utils.RemoteRefresh(this,snapshot);
    };

    PageView.prototype.update_content = function(){
        var that = this;

        console.info('update_content');


        if(that.model != undefined && that.model.hasFetched){

            // // Menu and Share Link in header
            // if(that.model.get('user_id._id') == App.Data.User.get('_id')){
            //     that.headerContent.ShareLinkController.show(that.headerContent.ShareLink);
            //     that.headerContent.MenuController.show(that.headerContent.Menu);
            // }


            // // title
            // this.TopBarMaximized.sequential.Title.setContent(that.model.get('title'));
            // this.TopBarMinimized.flexible.Title.setContent(that.model.get('title'));

            // // details/description
            // this.Details.setContent(that.model.get('details.occasion'));

            // // this.TopBarMinimized.flexible.Title.setContent(that.model.get('title'));

            // console.info('update_content');
            // console.log(that.model.get('tags'));

            // // "complete" tag
            // this.headerContent.Complete.Lightbox.show(this.headerContent.MarkComplete);
            // if(that.model.get('tags') && that.model.get('tags').indexOf('complete') !== -1){
            //     // complete
            //     this.headerContent.MarkComplete.setContent('<i class="icon ion-ios7-checkmark"></i>');
            //     this.headerContent.MarkComplete.setClasses(['header-tab-icon-text-big','marked-complete']);
            // } else {
            //     // Not complete
            //     this.headerContent.MarkComplete.setContent('<i class="icon ion-ios7-checkmark-outline"></i>');
            //     this.headerContent.MarkComplete.setClasses(['header-tab-icon-text-big']);
            // }

            // // Invoicing
            // this.headerContent.Invoice.Lightbox.show(this.headerContent.ViewInvoice);
            // if(that.model.get('invoice_id')){
            //     // complete
            //     this.headerContent.ViewInvoice.setContent('<i class="icon ion-social-usd"></i>');
            //     this.headerContent.ViewInvoice.setClasses(['header-tab-icon-text-big','marked-complete']);
            // } else {
            //     // Not complete
            //     this.headerContent.ViewInvoice.setContent('<i class="icon ion-social-usd"></i>');
            //     this.headerContent.ViewInvoice.setClasses(['header-tab-icon-text-big','marked-incomplete']);
            // }


            // // Images
            // var imgs = that.model.get('images');
            // if(imgs && imgs.length && that.last_image_order != imgs){
            //     // at least one, or a new order
            //     that.last_image_order = imgs;

            //     imgs.forEach(function(imgInfo,i){
            //         that.ImageComparison.flexible['Image'+(i+1)].setContent('<img src="'+imgInfo.urls.thumb300x300+'" />');

            //         // Update OptionButtons
            //         that.VotingOptions.flexible['Option' + (i+1)].image_id = imgInfo._id;

            //     });

            //     // this.headerContent.ViewInvoice.setContent('<i class="icon ion-social-usd"></i>');
            //     // this.headerContent.ViewInvoice.setClasses(['header-tab-icon-text-big','marked-complete']);
            // } else {
            //     // // No images
            //     // this.headerContent.ViewInvoice.setContent('<i class="icon ion-social-usd"></i>');
            //     // this.headerContent.ViewInvoice.setClasses(['header-tab-icon-text-big','marked-incomplete']);
            // }

            // // Voting Results
            // if(that.model.get('results')){
            //     var resultToSurface = {};

            //     imgs.forEach(function(imgInfo,i){
            //         // resultToSurface[imgInfo._id] = that.VotingResults.flexible.Result[i+1];
            //         that.VotingResults.flexible['Result' + (i+1)].setContent( (that.model.get('results.' + imgInfo._id) || 0) + ' votes' );
            //     });

            // }

            // // Voting Buttons
            // if(that.model.get('results')){
            //     var resultToSurface = {};

            //     imgs.forEach(function(imgInfo,i){
            //         // resultToSurface[imgInfo._id] = that.VotingResults.flexible.Result[i+1];
            //         that.VotingResults.flexible['Result' + (i+1)].setContent( (that.model.get('results.' + imgInfo._id) || 0) + ' votes' );
            //     });

            // }

            // // Voting Bar show/hide
            // if(that.model.get('user_id._id') == App.Data.User.get('_id')){
            //     that.VotingBar.show(that.VotingResults);
            // } else {

            //     // Show either that I can vote, or the "thanks for voting" box
            //     if(that.vote_model.hasFetched){
            //         if(that.vote_model.get('_id')){
            //             that.VotingBar.show(that.VotingDone);
            //             // that.VotingBar.hide();
            //         } else {
            //             that.VotingBar.show(that.VotingOptions);
            //         }
            //     }
            // }
                


            // // tags
            // var tagContent = '';
            // if(that.model.get('tags') && that.model.get('tags').length > 0){
            //     tagContent += '<div>';
            //     that.model.get('tags').forEach(function(tmpTag){
            //         tagContent += '<span class="label">'+S(tmpTag)+'</span>';
            //     });
            // } else {
            //     tagContent += '<div>';
            //         tagContent += 'no tags';
            //     tagContent += '</div>';
            // }
            // this.TopBarMaximized.Tags.Surface.setContent(tagContent);

        }

    };

    PageView.prototype.uploadMedia = function(imageURI){
        var that = this;

        Utils.Notification.Toast('Uploading');

        console.log('uploading...');
        console.log(this.player_id);
        console.log({
            token : App.Data.UserToken,
            // player_id : this.player_id,
            extra: {
                "description": "Uploaded from my phone testing 234970897"
            }
        });

        var ft = new FileTransfer(),
            options = new FileUploadOptions();

        options.fileKey = "file";
        options.fileName = 'filename.jpg'; // We will use the name auto-generated by Node at the server side.
        options.mimeType = "image/jpeg";
        options.chunkedMode = false;
        options.params = {
            token : App.Data.UserToken,
            contest_id: that.contest_id,
            extra: {
                "description": "Uploaded from my phone testing 193246"
            }
        };

        ft.onprogress = function(progressEvent) {
            
            if (progressEvent.lengthComputable) {
                // loadingStatus.setPercentage(progressEvent.loaded / progressEvent.total);
                // console.log('Percent:');
                // console.log(progressEvent.loaded);
                // console.log(progressEvent.total);
                console.log((progressEvent.loaded / progressEvent.total) * 100);
                Utils.Notification.Toast((Math.floor((progressEvent.loaded / progressEvent.total) * 1000) / 10).toString() + '%');
            } else {
                // Not sure what is going on here...
                // loadingStatus.increment();
                console.log('not computable?, increment');
            }
        };
        ft.upload(imageURI, App.Credentials.server_root + "contestcontent/media",
            function (e) {
                // getFeed();
                // alert('complete');
                // alert('upload succeeded');
                Utils.Notification.Toast('Upload succeeded');
                Utils.Notification.Toast('~10 seconds to process');

                // update collection
                Timer.setTimeout(function(){
                    that.contestContent.collection.fetch();
                },5000);

            },
            function (e) {
                console.error(e);
                Utils.Notification.Toast('Upload failed');
            }, options);
    };


    PageView.prototype.inOutTransition = function(direction, otherViewName, transitionOptions, delayShowing, otherView, goingBack){
        var that = this;

        var args = arguments;

        this._eventOutput.emit('inOutTransition', arguments);

        // emit on subviews
        _.each(this._subviews, function(obj, index){
            obj._eventInput.emit('inOutTransition', args);
        });

        switch(direction){
            case 'hiding':
                switch(otherViewName){

                    case 'ContestList':
                        // Overwriting and using default identity
                        transitionOptions.outTransform = Transform.identity;

                        Timer.setTimeout(function(){

                            // Hide
                            that.ContentStateModifier.setOpacity(0, transitionOptions.outTransition);

                        }, delayShowing);

                        break;


                    default:
                        // Overwriting and using default identity
                        transitionOptions.outTransform = Transform.identity;

                        // Hiding the sideView
                        // this.sideView.OpacityModifier.setOpacity(0);

                        // Content
                        Timer.setTimeout(function(){
                            // // Fade header
                            // that.header.StateModifier.setOpacity(0, transitionOptions.outTransition);

                            that.ContentStateModifier.setTransform(Transform.translate((window.innerWidth * (goingBack ? 1.5 : -1.5)),0,0), transitionOptions.outTransition);

                        }, delayShowing);

                        break;
                }

                break;
            case 'showing':
                if(this._refreshData){
                    Timer.setTimeout(this.refreshData.bind(this), 1000);
                }
                this._refreshData = true;
                switch(otherViewName){

                    case 'ContestList':

                        // No animation by default
                        transitionOptions.inTransform = Transform.identity;

                        // // Default header opacity
                        // that.header.StateModifier.setOpacity(0);

                        // Default opacity
                        that.ContentStateModifier.setOpacity(0);

                        // Content
                        // - extra delay
                        Timer.setTimeout(function(){

                            // Bring content back
                            that.ContentStateModifier.setOpacity(1, transitionOptions.inTransition);

                        }, delayShowing + transitionOptions.outTransition.duration);

                        break;

                    default:

                        // No animation by default
                        transitionOptions.inTransform = Transform.identity;

                        // // Default header opacity
                        // that.header.StateModifier.setOpacity(0);

                        that.ContentStateModifier.setTransform(Transform.translate((window.innerWidth * (goingBack ? -1.5 : 1.5)),0,0));

                        // Content
                        // - extra delay for content to be gone
                        Timer.setTimeout(function(){

                            that.ContentStateModifier.setTransform(Transform.translate(0,0,0), transitionOptions.outTransition);

                        }, delayShowing); // + transitionOptions.outTransition.duration);


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
            size: [undefined, undefined],
            inTransition: true,
            outTransition: true,
            overlap: true
        }
    };

    module.exports = PageView;

});
