/*globals define*/
define(function(require, exports, module) {

    var Engine = require('famous/core/Engine');
    var View = require('famous/core/View');
    var ScrollView = require('famous/views/Scrollview');
    var SequentialLayout = require('famous/views/SequentialLayout');
    var FlexibleLayout = require('famous/views/FlexibleLayout');
    var Surface = require('famous/core/Surface');
    var Modifier = require('famous/core/Modifier');
    var StateModifier = require('famous/modifiers/StateModifier');
    var Transitionable     = require('famous/transitions/Transitionable');
    var Transform = require('famous/core/Transform');
    var Matrix = require('famous/core/Transform');
    var RenderNode = require('famous/core/RenderNode')

    var Lightbox = require('famous/views/Lightbox');
    var RenderController = require('famous/views/RenderController');

    var Utility = require('famous/utilities/Utility');
    var Timer = require('famous/utilities/Timer');

    // Views
    var FormHelper = require('views/common/FormHelper');
    var BoxLayout = require('famous-boxlayout');
    var LayoutBuilder = require('views/common/LayoutBuilder');

    var HeaderFooterLayout = require('famous/views/HeaderFooterLayout');
    var NavigationBar = require('famous/widgets/NavigationBar');
    var GridLayout = require("famous/views/GridLayout");
    var ToggleButton = require('famous/widgets/ToggleButton');

    var Backbone = require('backbone-adapter');

    // Models
    var ContestContentModel = require("models/contest_content");

    // Extras
    var Utils = require('utils');
    var numeral = require('lib2/numeral.min');
    var _ = require('underscore');

    // Templates
    var Handlebars          = require('lib2/handlebars-adapter');
    var tpls                = {
        // text: require('text!./tpl/ContentText.html'),
        // image: require('text!./tpl/ContentImage.html'),
        // email: require('text!./tpl/ContentEmail.html'),
        // mark_complete: require('text!./tpl/ContentMarkComplete.html'),
        // mark_incomplete: require('text!./tpl/ContentMarkIncomplete.html'),
        // added_email: require('text!./tpl/ContentAddedEmail.html'),
        // generic_invoice_update: require('text!./tpl/ContentGenericInvoiceUpdate.html')
    };
    var templates           = {};
    _.each(tpls, function(val, key){
        templates[key] = Handlebars.compile(tpls[key]);
    });

    function SubView(options) {
        var that = this;
        View.apply(this, arguments);
        this.options = options;

        // Load models
        this.loadModels();

        // Should switch to a RenderController or Lightbox for displaying this content?
        // - it would make it easy to switch between Loading / No Results / RealResults

        // this.contentLayout = new SequentialLayout();
        this.contentLayout = new ScrollView();
        this.contentLayout.Views = [];
        this.contentLayout.sequenceFrom(this.contentLayout.Views);

        // this.createTemplates();

        this.createDefaultSurfaces();
        this.createDefaultLightboxes();


        // Need to wait for at least 1 item before showing the result?
        // - otherwise, there is a Render error
        this.add(this.lightboxContent);

    }

    SubView.prototype = Object.create(View.prototype);
    SubView.prototype.constructor = SubView;


    SubView.prototype.loadModels = function(player_id){
        var that = this;

        this.model = this.options.model;
        this.collection = this.model._related.Email;

        // Get related Emails for Thread
        // this.model.populated().then(function(){

            console.log(that.model._related.Email);
            that.collection.on("sync", that.updateCollectionStatus.bind(that), that);
            that.collection.on('add', that.addOne.bind(that), that);
            // that.model._related.Email.on('sync', that.addOne.bind(that), that);

            // populated().then(function(){
            //     // console.log(this);
            //     // console.log(that.model._related.Email.toJSON());
            //     console.log(that.model);
            //     // that.header.navBar.title.setContent(that.model._related.Email.length+ ' email'+(that.model._related.Email.length === 1 ? '':'s')+' in thread' );

            //     that.addEmails();
            // });
            that.model.fetchRelated();

        // });

        // // Create collection of Games for player_id
        // var options = {};
        // // if(this.options && this.options.filter){
        // //     options['$filter'] = this.options.filter;
        // // }
        // this.collection = new ContestContentModel.ContestContentCollection([],{
        //     // type: 'friend'
        //     contest_id: this.contest_id
        // });
        // this.collection.on("sync", that.updateCollectionStatus.bind(this), this);
        // this.collection.on("add", this.addOne, this);
        // // this.collection.on("remove", this.removeOne, this); // contest...
        this.collection.infiniteResults = 0;
        this.collection.totalResults = 0;

        // this.collection.fetch();

        // // this.prior_list = [];



        // // Listen for 'showing' events
        // this._eventInput.on('inOutTransition', function(args){
        //     // 0 = direction
        //     if(args[0] == 'showing'){
        //         that.collection.fetch();
        //     }
        // });

    };

    SubView.prototype.createDefaultSurfaces = function(){
        var that = this;

        // Should switch to a RenderController or Lightbox for displaying this content?
        // - it would make it easy to switch between Loading / No Results / RealResults

        // Create Loading Renderable
        // Create "No Results" Renderable
        this.loadingSurface = new Surface({
            content: "Loading",
            size: [undefined, 100],
            classes: ['loading-surface-default']
        });
        this.loadingSurface.pipe(this._eventOutput);
        this.emptyListSurface = new Surface({
            content: "Voting Conversation not yet available",
            size: [undefined, 100],
            classes: ['empty-list-surface-default'],
            properties: {
                'border-top' : '1px solid #dadada'
            }
        });
        this.emptyListSurface.pipe(this._eventOutput);


        // Create Loading Renderable
        this.infinityLoadingSurface = new Surface({
            content: "Loading...",
            size: [undefined, 50],
            classes: ['infinity-loading-surface-default']
        });
        this.infinityLoadingSurface.pipe(this._eventOutput);

        // Loaded 'em all!
        // - shows "X total events"
        this.infinityLoadedAllSurface = new Surface({
            content: "Loaded All, I guess?",
            size: [undefined, 50],
            classes: ['infinity-all-loaded-surface-default']
        });
        this.infinityLoadedAllSurface.pipe(this._eventOutput);

        // Show more
        this.infinityShowMoreSurface = new Surface({
            content: "Show More", // would usually show the total number left too
            size: [undefined, 50],
            classes: ['infinity-show-more-surface-default']
        });
        this.infinityShowMoreSurface.pipe(this._eventOutput);
        this.infinityShowMoreSurface.on('click', function(){
            that.next_page();
        });
    };

    SubView.prototype.createDefaultLightboxes = function(){
        var that = this;

        // Content Lightbox
        this.lightboxContent = new RenderController();
        this.lightboxContent.show(this.loadingSurface);
        this.lightboxContent.getSize = function(){
            try {
                var s = this._renderables[this._showing].getSize(true);
                if(s){
                    this.lastSize = [undefined, s[1]];
                    return [undefined, s[1]];
                }
            }catch(err){}
            // Last Size?
            if(this.lastSize){
                return this.lastSize;
            }
            return [undefined, true];
        };

        // Buttons lightbox
        this.lightboxButtons = new RenderController();
        this.lightboxButtons.show(this.infinityLoadingSurface);
        this.lightboxButtons.getSize = function(){
            try {
                var s = this._renderables[this._showing].getSize(true);
                if(s){
                    this.lastSize = [undefined, s[1]];
                    return [undefined, s[1]];
                }
            }catch(err){}
            // Last Size?
            if(this.lastSize){
                return this.lastSize;
            }
            return [undefined, true];
        };

    };

    SubView.prototype.addOne = function(Model){
        var that = this;

        var email = Model.toJSON();
        console.log(email);
        var index = 1;

        // SequentialLayout to hold Header(To,From,Actions),Body, Signature
        var EmailView = new LayoutBuilder({
            sequential: {
                direction: 1,
                size: [undefined, true],
                sequenceFrom: [{
                    surface: {
                        key: 'From',
                        surface: new Surface({
                            content: Handlebars.helpers.personName(email.original.headers.From_Parsed[0]),
                            size: [undefined, true],
                            classes: ['email-list-item-from']
                        }),
                        pipe: that.contentLayout
                    }
                }
                ,that.build_body.call(that, email)
                ]
            }
        });

        EmailView.Model = Model;
        
        // EmailView.TransitionModifier = new StateModifier({
        //     // transform: Transform.translate(window.innerWidth,0,0)
        //     transform: Transform.translate(0,0,0)
        // });
        // var EmailsSeqLayout = new SequentialLayout();
        // EmailView.EmailsSeqLayout = EmailsSeqLayout;

        // var EmailSeq = [];

        // var views = {};

        // // Create the From
        // views.From = new View();
        // views.From.Surface = new Surface({
        //     content: Handlebars.helpers.personName(email.original.headers.From_Parsed[0]),
        //     size: [undefined, 20],
        //     classes: [],
        //     properties: {
        //         color: "black",
        //         backgroundColor: "#f8f8f8",
        //         lineHeight: "20px"
        //     }
        // });
        // views.From.add(views.From.Surface);

        // views.From.Surface.pipe(that.contentLayout);

        // // Cc
        // // Bcc

        // // console.log(Handlebars);
        // // console.log(Handlebars.helpers.personName(email.original.headers.From_Parsed[0]));

        // // Pretty headers surface
        // views.PrettyHeaders = new View();
        // views.PrettyHeaders.Surface = new Surface({
        //     content: JSON.stringify(email.original.headers),
        //     size: [undefined, true]
        // });
        // views.PrettyHeaders.DisplayMod = new StateModifier();

        // views.PrettyHeaders.add(views.PrettyHeaders.DisplayMod).add(views.PrettyHeaders.Surface.RealSizeMod).add(views.PrettyHeaders.Surface);
        // views.PrettyHeaders.Surface.pipe(that.contentLayout);

        // views.Body = new View();
        // views.Body.Surface = new Surface({
        //     content: that.display_bodies(email),
        //     // content: nl2br(emails[index]),
        //     // size: [(window.innerWidth) - ((window.innerWidth / 5) * index), true],
        //     size: [window.innerWidth - 10, true],
        //     classes: ["email-list-item"],
        //     properties: {
        //         lineHeight: '20px',
        //         padding: '5px',
        //         // borderRadius: "3px",
        //         backgroundColor: "white"
        //         // backgroundColor: "hsl(" + ((index+1) * 360 / 40) + ", 100%, 50%)",
        //     }
        // });
        // views.Body.Surface.pipe(that.contentLayout);
        // // views.Body.Surface.on('sizeUpdated', function(newSize){

        // //     console.info('deployed newSize in Thread', newSize);
        // //     // console.log(this);
        // //     // console.log(this._size);
        // //     // console.log(this.getSize(true));

        // //     var paddingSize = 10;
        // //     this.View.PaddingModifier.setSize([undefined, newSize[1] + paddingSize]);

        // //     // console.log(newSize[1] + paddingSize);
        // //     // this.View.bgSizeModifier.setSize([undefined, newSize[1]]);

        // //     // surface.PaddingModifier.setSize([undefined, surface.getSize()[1]]);
        // // }.bind(views.Body));

        // views.Body.Email = email;
        // views.Body.Surface.Email = email;

        // // views.Body.bg = new Surface({
        // //     size: [undefined, undefined],
        // //     properties: {
        // //         // backgroundColor: "blue",
        // //         zIndex: "-1"
        // //     }
        // // });
        // // views.Body.bg.pipe(that.contentLayout);

        // // views.Body.bg.SizeModifier = new StateModifier();
        // // views.Body.TransitionModifier = new StateModifier({
        // //     transform: Transform.translate(window.innerWidth,0,0)
        // // });
        // // views.Body.PaddingModifier = new StateModifier({
        // //     // will be changing size
        // //     // size: [window.innerWidth - 20, true]
        // // });
        // // views.Body.OriginModifier = new StateModifier({
        // //     origin: [0.5, 0.5]
        // //     // will be changing size
        // //     // size: [window.innerWidth - 20, true]
        // // });
        // // var node = surface.View.add(surface.View.TransitionModifier).add(surface.View.PaddingModifier);
        // // node.add(surface.View.bg);
        // // node.add(surface.View.OriginModifier).add(surface);

        // views.Body.add(views.Body.Surface.RealSizeMod).add(views.Body.Surface);

        // views.Spacer = new View();
        // views.Spacer.Surface = new Surface({
        //     size: [undefined, 20]
        // });
        // views.Spacer.add(views.Spacer.Surface);
        // views.Spacer.Surface.pipe(that.contentLayout);

        // EmailSeq.push(views.From);
        // EmailSeq.push(views.Body);
        // EmailSeq.push(views.Spacer);

        // // Add views to SeqLayout object for accessing easily later
        // EmailsSeqLayout.views = views;


        // EmailsSeqLayout.sequenceFrom(EmailSeq);

        // // Transform in
        // // - not sure if it has even been displayed
        // // that.whenPageVisible(function(){
        // if(that._whenPageVisible === true){
        //     Timer.setTimeout(function(){
        //         this.TransitionModifier.setTransform(Transform.translate(0,0,0), { duration: 500, curve: 'easeOutBounce' });
        //     }.bind(EmailView), index * 100);
        //     console.log('transform in from PageVisible');
        // }
        // // });

        // // // surface.pipe(surface.draggable)
        // // surface.pipe(that.contentLayout);
        // EmailView.add(EmailView.TransitionModifier).add(EmailsSeqLayout);
        // // EmailView.TransitionModifier.add(EmailsSeqlayout)


        this.contentLayout.Views.splice(this.contentLayout.Views.length-1, 0, EmailView);
        this.collection.infiniteResults += 1;

    };

    SubView.prototype.build_body = function(email){
        var that = this;

        return {
            surface: {
                key: 'Body',
                surface: new Surface({
                    content: that.display_bodies(email),
                    size: [undefined, true],
                    classes: ['email-list-item-body']
                }),
                pipe: that.contentLayout
            }
        };
    };

    SubView.prototype.display_bodies = function(Email, no_nl2br) {
        // Display the first ParsedData entry
        // - hide any additional entries

        no_nl2br = no_nl2br == true ? true : false;

        var parsedData = Email.original.ParsedData;
        // console.dir(Email.original.ParsedData);
        var tmp = '';

        // Building sections
        // - now incorporates Edited Emails (minimail only)
        var i = 0;

        _.each(parsedData,function(pieceOfData, index){
            i++;
            var content = '';
            
            pieceOfData.Body = pieceOfData.Data; //Utils.safeString(pieceOfData.Data);

            try {
                if(pieceOfData.Body.length > 0){
                    content = no_nl2br ? pieceOfData.Body : Utils.nl2br(pieceOfData.Body, false);

                    if($.trim(content) == ""){
                        // Missing content, probably HTML content
                        // content = "[Email Content as HTML]"; // content non-existant, need to show a button for HTML view?
                        content = '<button class="btn btn-info view-html-email">View Fancy Email</button>';
                    }

                    tmp += '<div class="ParsedDataContent" data-level="'+index+'">'+content+'</div>';
                    // tmp += '<div class="signature">' + Utils.nl2br(pieceOfData.Signature) + '</div>';
                    // content += '<div class="signature">' + Utils.nl2br(pieceOfData.Signature) + '</div>';
                    // go to next parsedData

                    return tmp;
                } else {
                    // pieceOfData.Data = htmlEntities(pieceOfData.Data);
                    content = pieceOfData.Data;
                    content = $.trim(content);
                    content = no_nl2br ? content : Utils.nl2br(content,false);
                    
                }
            } catch(err){
                // console.log(parsedData[x]);
                // pieceOfData.Data = htmlEntities(pieceOfData.Data);
                content = pieceOfData.Data;
                content = $.trim(content);
                // console.log(content);
                // debugger;
                content = no_nl2br ? content : Utils.nl2br(content,false);

                if($.trim(content) == ""){
                    // Missing content, probably HTML content
                    // content = "[Email Content as HTML]";  // content non-existant, need to show a button for HTML view?
                    content = '<button class="btn btn-info view-html-email">View Fancy Email</button>';
                }
                // debugger;
            }

            tmp += '<div class="ParsedDataContent" data-level="'+index+'">'+content+'</div>';
            
        });

        // Clickable selector to see the rest of the conversation
        // - only if the conversation is much longer
        if (i > 1){
            // //tmp += '<div class="ParsedDataShowAll"><span>show '+ (i-1) +' previous</span></div>';

            // Uncomment the following (latest version)
            // tmp += '<div class="ParsedDataShowAll clearfix"><span class="expander">...</span><span class="edit">E</span></div>';
        }

        console.log(tmp);

        // console.log(Handlebars);
        // return new Handlebars.SafeString(tmp);
        // return $('<div/>').text(tmp).html();
        // debugger;
        return tmp;

    };

    SubView.prototype.updateCollectionStatus = function() { 
        console.info('updateCollectionStatus');

        this.collection.totalResults = this.collection.length;

        // Update amounts left
        var amount_left = this.collection.totalResults - this.collection.infiniteResults;
        this.infinityShowMoreSurface.setContent(amount_left + ' more');
        this.infinityLoadedAllSurface.setContent(this.collection.totalResults + ' total');

        var nextRenderable;
        if(this.collection.length == 0 && this.collection.infiniteResults == 0){
            nextRenderable = this.emptyListSurface;
        } else {
            nextRenderable = this.contentLayout;
        }

        if(nextRenderable != this.lightboxContent.lastRenderable){
            this.lightboxContent.lastRenderable = nextRenderable;
            this.lightboxContent.show(nextRenderable);
        }

        // // Splice out the lightboxButtons before sorting
        // var popped = this.contentLayout.Views.pop();

        // Resort the contentLayout.Views
        this.contentLayout.Views = _.sortBy(this.contentLayout.Views, function(v){
            return v.Model.get('created');
        });
        this.contentLayout.Views.reverse();

        // this.contentLayout.Views.push(popped);

        // console.log(this.contentLayout.Views);

        // Re-sequence?
        this.contentLayout.sequenceFrom(this.contentLayout.Views);

        // Show correct infinity buttons (More, All, etc.)
        this.render_infinity_buttons();

    };

    SubView.prototype.render_infinity_buttons = function(){
        // Renders the correct infinity-list buttons (the "Show More" or "Is loading" button/hint) at the bottom of the page

        // // Hide all dat shit
        // // - unnecessary?
        // this.$('.load-list').addClass('nodisplay');

        // at the end?
        if(this.collection.infiniteResults == this.collection.totalResults){
            this.lightboxButtons.show(this.infinityLoadedAllSurface);
            // this.$('.loaded-all').removeClass('nodisplay');
        } else {
            // Show more
            // - also includes the number more to show :)
            this.lightboxButtons.show(this.infinityShowMoreSurface);
            // this.$('.show-more').removeClass('nodisplay');
        }

    };

    SubView.prototype.refresh_any_new = function(){
        // Load any newly-created (since we last loaded) models
        // - contest...

        // bascially like next_page, right?

        // Load more games
        var that = this;

        // Make sure we're only loading one page at a time
        if(this.isUpdating === true){
            return;
        }
        this.isUpdating = true;

        console.info('actually next_page');
        // debugger;

        this.lightboxButtons.show(this.infinityLoadingSurface);
        // this.$('.load-list').addClass('nodisplay');
        // this.$('.loading-progress').removeClass('nodisplay');

        // Init request
        this.collection.requestNextPage({
            success: function(){
                // alert('loaded next page!');
                that.isUpdating = false;
                // Utils.Notification.Toast('Showing Alerts');
                that.render_infinity_buttons();
            },
            error: function(){
                that.isUpdating = false;
                Utils.Notification.Toast('Failed loading more Alerts!');
                that.render_infinity_buttons();
            }
        });
    };

    SubView.prototype.next_page = function(){
        // Load more games
        var that = this;

        // Make sure we're only loading one page at a time
        if(this.isUpdating === true){
            return;
        }
        this.isUpdating = true;

        console.info('actually next_page');
        // debugger;

        this.lightboxButtons.show(this.infinityLoadingSurface);
        // this.$('.load-list').addClass('nodisplay');
        // this.$('.loading-progress').removeClass('nodisplay');

        // Init request
        this.collection.requestNextPage({
            success: function(){
                // alert('loaded next page!');
                that.isUpdating = false;
                // Utils.Notification.Toast('Showing Alerts');
                that.render_infinity_buttons();
            },
            error: function(){
                that.isUpdating = false;
                Utils.Notification.Toast('Failed loading more Alerts!');
                that.render_infinity_buttons();
            }
        });
    };

    SubView.prototype.remoteRefresh = function(snapshot){
        var that = this;

        console.info('RemoteRefresh - SubView');

        this.collection.fetch();

        // // emit on subviews
        // _.each(this._subviews, function(tmpSubview){
        //     if(typeof tmpSubview.remoteRefresh == "function"){
        //         tmpSubview.remoteRefresh(snapshot);
        //     }
        // });

    };


    SubView.DEFAULT_OPTIONS = {
    };

    module.exports = SubView;

});
