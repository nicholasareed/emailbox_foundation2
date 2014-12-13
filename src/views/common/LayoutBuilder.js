define(function(require, exports, module) {


    var Scene = require('famous/core/Scene');
    var Surface = require('famous/core/Surface');
    var ElementOutput = require('famous/core/ElementOutput');
    var RenderNode = require('famous/core/RenderNode');
    var Transform = require('famous/core/Transform');
    var View = require('famous/core/View');

    var Modifier = require('famous/core/Modifier');
    var StateModifier = require('famous/modifiers/StateModifier');

    var Surface = require('famous/core/Surface');
    var ImageSurface = require('famous/surfaces/ImageSurface');
    var InputSurface = require('famous/surfaces/InputSurface');
    var TextareaSurface = require('famous/surfaces/TextareaSurface');
    var SubmitInputSurface = require('famous/surfaces/SubmitInputSurface');

    var ContainerSurface = require('famous/surfaces/ContainerSurface');
    var FormContainerSurface = require('famous/surfaces/FormContainerSurface');

    var Timer = require('famous/utilities/Timer');
    var Utils = require('utils');

    var RenderController = require('famous/views/RenderController');
    var GridLayout = require('famous/views/GridLayout');
    var FlexibleLayout = require('famous/views/FlexibleLayout');
    var SequentialLayout = require('famous/views/SequentialLayout');
    var ScrollView = require('famous/views/Scrollview');

    var $ = require('jquery');
    var _ = require('underscore');
    var tinycolor           = require('lib2/tinycolor');
    var spectrum            = require('lib2/spectrum');

    var BoxLayout = require('famous-boxlayout');

    function LayoutBuilder(options) {
        var that = this;
        View.apply(this, arguments);

        // accepts a dictionary and returns a built layout
        // - expectecting references/names for all items passed in (Surfaces, etc.)

        // Size modifier?
        // - wrap in a rendernode
        // - if String, then using a Modifier function

        var node; // the RenderNode (with size modifier) that gets returned!
        var returnNode; // node that
        var originalNode; // node of the actual element we're using (Surface, SequentialLayout, etc.)
        var name;

        var result;

        var sizeMod = options.size;

        // maybe passing in a famous-like element already?, that just needs a name?

        // "extract" out the keys we might want to use

        // What type are we going to use?
        if(options.surface){
            // EXPECTING a title/key to be here

            var tmpSurfaceNode = this.createSurface(options.surface);
            name = tmpSurfaceNode[0];
            returnNode = tmpSurfaceNode[1];
            originalNode = tmpSurfaceNode[2];

        } else if(options.flexible){
            name = 'flexible';
            result = this.createFlexibleLayout(options.flexible);
            originalNode = result[0];
            returnNode = result[1];

        } else if(options.sequential){
            name = 'sequential';
            result = this.createSequentialLayout(options.sequential);
            originalNode = result[0];
            returnNode = result[1];
        } else if(options.scroller){
            name = 'scroller';
            result = this.createScrollviewLayout(options.scroller);
            originalNode = result[0];
            returnNode = result[1];

        } else if(options.flipper){

        } else if(options.grid){
            name = 'grid';
            result = this.createGridLayout(options.grid);
            originalNode = result[0];
            returnNode = result[1];
        } else if(options.controller){
            // would be great to have an "unslot me if I'm hidden" type of option... (or support 0-height Views!!!!)
            name = 'controller';
            result = this.createRenderController(options.controller);
            originalNode = result[0];
            returnNode = result[1];
        } else {
            console.error('missing type of Layout to build');
            console.log(options);
            debugger;
        }

        // change name?
        if(!options.surface && options[name].key){
            name = options[name].key;
        }

        // set the size (can handle a bunch of passed-in sizes)
        // - functions, string, etc.

        if(sizeMod){
            if(sizeMod instanceof Function){
                node = new RenderNode(new Modifier({
                    size: sizeMod
                }));
            } else if(sizeMod instanceof String){
                // example??
                node = new RenderNode(new Modifier({
                    size: function(){
                        return returnNode.getSize();
                    }
                }));
            } else {
                node = new RenderNode(new Modifier({
                    size: function(){
                        var w = sizeMod[0],
                            h = sizeMod[1];
                        if(typeof sizeMod[0] == "string"){
                            w = returnNode.getSize()[0];
                        }
                        if(typeof sizeMod[1] == "string"){
                            h = returnNode.getSize()[1];
                        }
                        // console.log(sizeMod, w, h, typeof sizeMod[1]);
                        return [w, h];
                    }
                }));
            }

        } else {
            // build our own size
            node = new RenderNode(new Modifier({
                size: function(val){
                    // console.log(returnNode);
                    // console.log(options);
                    return (returnNode && returnNode.getSize) ? returnNode.getSize(val) : [undefined, undefined];
                }
            }));
        }

        // modifiers
        // var nodeTmp = [];
        // nodeTmp.push(node);
        node[name] = originalNode ? originalNode : returnNode;
        node.hasName = name;
        if(name === 'grid'){
            // debugger;
        }

        if(options.plane){
            node.add(Utils.usePlane.apply(this,options.plane)).add(returnNode);
        } else {
            node.add(returnNode);
        }

        if(originalNode){
            // console.log(node);
            // debugger;
        }

        return node;

    }

    LayoutBuilder.prototype = Object.create(View.prototype);
    LayoutBuilder.prototype.constructor = LayoutBuilder;

    LayoutBuilder.prototype.buildModsForNode = function(endNode,options){
        var that = this;


        if(!options.mods){
            return endNode;
        }

        if(!endNode.sizer){
            endNode.sizer = [];
        }

        // mods can be added via the "mods:" obj, or through "size:" , "origin:" etc on the options obj

        var tmpRenderNode = new RenderNode();

        var nodeTmp = [];
        nodeTmp.push(tmpRenderNode);

        options.mods.forEach(function(modObj){
            if(modObj === 'sizer'){
                var tmpSurf  = new Surface({
                    content: '',
                    size: [undefined, undefined],
                    properties: {
                        // background: 'red'
                    }
                 });

                var x = new StateModifier({
                    transform: Transform.translate(0,-100000, -1000000)
                });

                nodeTmp[nodeTmp.length - 1].add(x).add(tmpSurf)
                // nodeTmp.push(nodeTmp[nodeTmp.length - 1].add(x).add(tmpSurf));  
                endNode.sizer.push(tmpSurf);
                return;
            }

            // expecting an Object with keys like size,origin,align
            var tmpMod = new Modifier(modObj);

            nodeTmp.push(nodeTmp[nodeTmp.length - 1].add(tmpMod));
        });


        // node[name] = returnNode;
        nodeTmp[nodeTmp.length - 1].add(endNode);

        // Return the FIRST element in the chain, that has our thoroughly-modded endNode at the end
        return tmpRenderNode;
    };

    LayoutBuilder.prototype.buildMargins = function(endNode,options){
        var that = this;

        if(!options.margins){
            return endNode;
        }

        var boxLayout = new BoxLayout({ margins: options.margins });
        boxLayout.middleAdd(endNode);

        return boxLayout;
    };

    LayoutBuilder.prototype.createSurface = function(options){
        var that = this;

        // Name of the surface is acquired through a passed Key, or it looks like - Title: new Surface({...

        var originalNode;

        // GET THE KEY
        var name = options.key ? options.key : _.without(Object.keys(options),'click','pipe','mods','size','deploy','plane')[0];
        originalNode = options.key ? options.surface : options[name];

        if(options.click){
            originalNode.on('click', options.click);
        }
        if(options.pipe){
            originalNode.pipe(options.pipe);
        }
        if(options.events){
            // Timer.setTimeout(function(){
                options.events(originalNode);
            // },1);

        }
        if(options.deploy){
            originalNode.on('deploy', options.deploy);
        }

        var newNode = this.buildModsForNode( originalNode, options );
        newNode = this.buildMargins( newNode, options);

        return [name, newNode, originalNode];

    };

    LayoutBuilder.prototype.createFlexibleLayout = function(options){
        var that = this;

        var tmp = new FlexibleLayout({
            direction: options.direction,
            ratios: options.ratios
        });
        tmp.Views = [];


        if(options.size){
            // Expecting a True in either one
            // - otherwise, returning undefined for h/w

            // Used for true Height or Width(v2) 
            // - only allowing horizontal direction for now?
            var h,w;
            if(options.direction == 0 && options.size[1] === true){

                tmp.getSize = function(){

                    var maxHeight = 0;

                    tmp.Views.forEach(function(v){
                        // console.log(v);
                        // console.log(v.getSize());
                        var h = 0;
                        try{
                            h = v.getSize(true)[1];
                        }catch(err){
                            console.log('nosize');
                        }
                        if(h > maxHeight){
                            maxHeight = h;
                        }
                    });

                    return [undefined, maxHeight];
                }
                
            }
        }


        // sequenceFrom
        options.sequenceFrom.forEach(function(objs){

            var nodes = [];
            var tmpNode = new RenderNode();

            if(!(objs instanceof Array)){
                objs = [objs];
            }

            objs.forEach(function(obj){

                var objTempNode;

                if(obj instanceof ElementOutput ||
                   obj instanceof RenderNode ||
                   obj instanceof View ||
                   obj instanceof Surface){
                    objTempNode = obj;
                } else if((typeof obj).toLowerCase() == 'object'){
                    var typofLayout = _.without(Object.keys(obj),'size','mods','deploy','dimensions','sequenceFrom','plane')[0]; // "surface"
                    var name = obj[typofLayout].key ? obj[typofLayout].key : Object.keys(obj[typofLayout])[0];
                    objTempNode = new LayoutBuilder(obj);

                    if(objTempNode.hasName){
                        tmp[objTempNode.hasName] = objTempNode[objTempNode.hasName];
                        tmp[objTempNode.hasName].NodeWithMods = objTempNode;
                    } else {
                        tmp[name] = objTempNode;
                    }
                } else {
                    console.error('unknown type');
                    debugger;
                }
                // console.log(objTempNode);
                tmpNode.add(objTempNode);
                nodes.push(objTempNode);
            });

            tmpNode.getSize = nodes[0].getSize.bind(nodes[0]);

            // console.info('tmpNode', tmpNode);
            tmp.Views.push(tmpNode);
        });

        tmp.sequenceFrom(tmp.Views);

        // constantly reset the ratios?
        // Timer.setInterval(function(){
        //     // check if actually displayed?
        //     tmp.setRatios(tmp.options.ratios);
        // },16);

        var newNode = this.buildModsForNode( tmp, options );
        newNode = this.buildMargins( newNode, options);

        return [tmp, newNode];

    };

    LayoutBuilder.prototype.createSequentialLayout = function(options){
        var that = this;

        var tmp = new SequentialLayout({
            direction: options.direction === 0 ? 0 : 1
        });
        tmp.Views = [];

        if(options.size){
            // Expecting a True in either one
            // - otherwise, returning undefined for h/w

            // Used for true Height or Width(v2) 
            // - only allowing horizontal direction for now?
            var h,w;
            if(options.direction == 0 && options.size[1] === true){

                tmp.getSize = function(){

                    var maxHeight = 0;

                    tmp.Views.forEach(function(v){
                        // console.log(v);
                        // console.log(v.getSize());
                        var h = 0;
                        try{
                            h = v.getSize(true)[1];
                        }catch(err){
                            console.log('nosize');
                        }
                        if(h > maxHeight){
                            maxHeight = h;
                        }
                    });

                    return [undefined, maxHeight];
                }
                
            }
        }
        
        // sequenceFrom
        options.sequenceFrom.forEach(function(obj){

            var tmpNode;
            if(obj instanceof SequentialLayout ||
                obj instanceof ElementOutput ||
               obj instanceof RenderNode ||
               obj instanceof View ||
               obj instanceof Surface){
                tmpNode = obj;

            } else if(obj == null){
                // skip this one
                return;
            } else if((typeof obj).toLowerCase() == 'object'){
                var typofLayout = _.without(Object.keys(obj),'size','mods','deploy','dimensions','sequenceFrom','deploy','plane')[0]; // "surface"
                var name = obj[typofLayout].key ? obj[typofLayout].key : Object.keys(obj[typofLayout])[0];
                tmpNode = new LayoutBuilder(obj);

                // if(name === 'grid' || tmpNode.hasName){
                //     alert(tmpNode.hasName);
                //     alert(name);
                //     debugger;
                // }
                if(tmpNode.hasName){
                    tmp[tmpNode.hasName] = tmpNode[tmpNode.hasName];
                    tmp[tmpNode.hasName].NodeWithMods = tmpNode;
                } else {
                    console.log(name);
                    debugger;
                    tmp[name] = tmpNode;
                }

                // var typofLayout = _.without(Object.keys(obj),'size','mods','deploy')[0]; // "surface"
                // var name = obj[typofLayout].key ? obj[typofLayout].key : Object.keys(obj[typofLayout])[0];
                // tmpNode = new LayoutBuilder(obj);
                // tmp[name] = tmpNode;
            } else {
                console.error('unknown type');
                debugger;
            }
            
            // console.info('tmpNode', tmpNode);
            tmp.Views.push(tmpNode);
        });

        tmp.sequenceFrom(tmp.Views);

        var newNode = this.buildModsForNode( tmp, options );
        newNode = this.buildMargins( newNode, options);

        return [tmp, newNode];

    };

    LayoutBuilder.prototype.createScrollviewLayout = function(options){
        var that = this;

        var tmp = new ScrollView({
            direction: options.direction === 0 ? 0 : 1
        });
        tmp.Views = [];

        // sequenceFrom
        options.sequenceFrom.forEach(function(obj){

            var tmpNode;
            if(obj instanceof ElementOutput ||
               obj instanceof RenderNode ||
               obj instanceof View ||
               obj instanceof Surface){
                tmpNode = obj;
            } else if((typeof obj).toLowerCase() == 'object'){
                var typofLayout = _.without(Object.keys(obj),'size','mods','deploy','plane')[0]; // "surface"
                var name = obj[typofLayout].key ? obj[typofLayout].key : Object.keys(obj[typofLayout])[0];
                tmpNode = new LayoutBuilder(obj);
                // tmp[name] = tmpNode;
                // tmp[name].NodeWithMods = tmpNode;
                if(tmpNode.hasName){
                    tmp[tmpNode.hasName] = tmpNode[tmpNode.hasName];
                    tmp[tmpNode.hasName].NodeWithMods = tmpNode;
                } else {
                    console.log(name);
                    debugger;
                    tmp[name] = tmpNode;
                }
            } else {
                console.error('unknown type');
                debugger;
            }

            // console.info('tmpNode', tmpNode);
            tmp.Views.push(tmpNode);
        });

        tmp.sequenceFrom(tmp.Views);

        var newNode = this.buildModsForNode( tmp, options );
        newNode = this.buildMargins( newNode, options);
        
        return [tmp, newNode];

    };

    LayoutBuilder.prototype.createGridLayout = function(options){
        var that = this;

        var tmp = new GridLayout({
            dimensions: options.dimensions || [] // 3 col, 4 row
        });
        tmp.Views = [];

        if(options.size){
            // Expecting a True in either one
            // - otherwise, returning undefined for h/w

            // Used for true Height or Width(v2) 
            // - only calculating the Height at the moment
            var h,w;

            // Height
            if(options.size[1] === true){

                tmp.getSize = function(){
                    
                    var columnCount = options.dimensions[0];

                    // Uses the number of rows to determine the max-height of an individual column

                    var maxHeights = _.map(_.range(columnCount), function(){return 0;}); // number of columns we're counting

                    tmp.Views.forEach(function(v,i){
                        var h = v.getSize(true)[1];
                        maxHeights[columnCount%(i+1)] += h;
                        // if(h > maxHeight){
                        //     maxHeight = h;
                        // }
                    });
                    
                    return [undefined, Math.max(maxHeights)];
                }
                
            }

            // Width
            // - todo

        }

        // sequenceFrom
        options.sequenceFrom.forEach(function(obj){

            var tmpNode;
            if(obj instanceof ElementOutput ||
               obj instanceof RenderNode ||
               obj instanceof View ||
               obj instanceof Surface){
                tmpNode = obj;
            } else if((typeof obj).toLowerCase() == 'object'){
                var typofLayout = _.without(Object.keys(obj),'size','mods','deploy','plane')[0]; // "surface"
                var name = obj[typofLayout].key ? obj[typofLayout].key : Object.keys(obj[typofLayout])[0];
                tmpNode = new LayoutBuilder(obj);
                if(tmpNode.hasName){
                    tmp[tmpNode.hasName] = tmpNode[tmpNode.hasName];
                    tmp[tmpNode.hasName].NodeWithMods = tmpNode;
                } else {
                    console.log(name);
                    debugger;
                    tmp[name] = tmpNode;
                }
            } else {
                console.error('unknown type');
                debugger;
            }

            console.info('tmpNode', tmpNode);
            tmp.Views.push(tmpNode);
        });

        tmp.sequenceFrom(tmp.Views);

        // // size?
        // if(options.size){
        //     tmp.getSize = function(){
        //         var combinedWidth = 0;

        //         var maxHeight = 0;
        //         if(options.size[0] == undefined)
        //         contestView.Layout.sequential.Top.Views.forEach(function(v){
        //             var h = v.getSize(true)[1];
        //             if(h > maxHeight){
        //                 maxHeight = h;
        //             }
        //         });
        //     }
        // }


        var newNode = this.buildModsForNode( tmp, options );
        newNode = this.buildMargins( newNode, options);

        return [tmp, newNode];

    };

    LayoutBuilder.prototype.createRenderController = function(options){
        var that = this;

        var tmp = new RenderController({
            showingSize: options.showingSize
        });
        tmp.Views = [];

        // Just create a bunch of views
        // - not attaching any yet, except via name to the RenderController.Views
        options.Views.forEach(function(obj){

            var tmpNode;
            if(obj instanceof ElementOutput ||
               obj instanceof RenderNode ||
               obj instanceof View ||
               obj instanceof Surface){
                tmpNode = obj;
            } else if((typeof obj).toLowerCase() == 'object'){
                var typofLayout = _.without(Object.keys(obj),'size','mods','deploy','plane')[0]; // "surface"
                var name = obj[typofLayout].key ? obj[typofLayout].key : Object.keys(obj[typofLayout])[0];
                tmpNode = new LayoutBuilder(obj);
                if(tmpNode.hasName){
                    tmp[name] = tmpNode[tmpNode.hasName];
                    tmp[name].NodeWithMods = tmpNode;
                } else {
                    tmp[name] = tmpNode;
                }
            } else {
                console.error('unknown type');
                debugger;
            }

            // console.info('tmpNode', tmpNode);
            tmp.Views.push(tmpNode);
        });

        // Default to select?
        if(options.default){
            var viewToShow = options.default();
            if(viewToShow){
                // Timer.setTimeout(function(){
                    tmp.show(viewToShow);
                // },1);
            }
        }

        if(options.events){
            // Timer.setTimeout(function(){
                options.events(tmp);
            // },1);
        }

        var newNode = this.buildModsForNode( tmp, options );
        newNode = this.buildMargins( newNode, options);

        return [tmp, newNode];

    };

    LayoutBuilder.DEFAULT_OPTIONS = {
        
    };

    module.exports = LayoutBuilder;
});