// defines brush type
var UNDEF = -100;
var ERASER = 100;
var PEN = 101;
 
// ****************** ANNOTATION TOOL - CLASS DEFINITION *********************
// it handles the user interface
 
//ctor
var AnnotationTool = function(){
    this.layers = []; // this variable contains all the layers (including bkground)
    this.mode = PEN;  // drawing mode (currently only PEN or ERASER)
    this.brushSize = 5;
    this.brushColor = "";
};
 
AnnotationTool.prototype.increaseBrushSize = function(){
    this.brushSize++;
};
 
AnnotationTool.prototype.decreaseBrushSize = function(){
    this.brushSize--;
    if (this.brushSize <= 0)
        this.brushSize = 1;
};
 
AnnotationTool.prototype.addNewLayer = function(){
    var nextId = this.layers.length;
    this.layers[nextId] = new Layer(nextId, false, this);
    let w = this.layers[0].backgroundImage.width;
    let h = this.layers[0].backgroundImage.height;
    this.layers[nextId].setupCanvas(0, 0, w, h);
    this.layers[nextId].addLayerToPanel();
};
 
 
// *********************** LAYER - CLASS DEFINITION ****************************
// a layer is a combination of bitmap and annotation info
 
//ctor 
var Layer = function(id, isBkg, annTool){
    var iframeDoc = document.getElementById("canvas_container").contentWindow.document;
    this.canvas = iframeDoc.createElement('canvas');
    this.interactionCanvas;
    this.id = id;
    this.canvasContext;
    this.canvas.id = 'canvas_'+id;
    this.bkgroundInitialized = false;
    
    document.getElementById('canvas_container').contentDocument.body.appendChild(this.canvas);
    this.name = "layer_" + id;
     
    this.isBackground = isBkg;
    this.backgroundImage;
    this.thumbnail;
    
    //drawing handling variables
    this.mouseX;
    this.mouseY;
    this.lastX;
    this.lastY;
    this.isMouseDown=false;
    this.annotationTool = annTool;  //object that keeps all the draing mode settings          

    this.init();    
};

Layer.prototype.init = function() {
    
    if (this.isBackground){
        this.backgroundImage = new Image();
        let that = this;
        this.backgroundImage.onload = function(){ that.imageLoaded(0,0); };
    }
   
    let that = this;
    this.canvas.onmouseup = function(e, pos){ that.mouseup(e, pos);};
    this.canvas.onmousedown = function(e, pos){ that.mousedown(e, pos);};
    this.canvas.onmousemove = function(e, pos){ that.mousemove(e, pos);};
    this.canvas.onmouseout = function(e, pos){ that.mouseout(e, pos);};
   
    //this.canvas.focus();
};

Layer.prototype.addInteractionLayer = function(x,y,w,h) {
    var iframeDoc = document.getElementById("canvas_container").contentWindow.document;
    this.interactionCanvas = iframeDoc.createElement('canvas');
    this.interactionCanvas.style.left = x;
    this.interactionCanvas.style.right = y;
    this.interactionCanvas.style.position = 'absolute';
    
    this.interactionCanvas.width = w;
    this.interactionCanvas.height = h;
    
    let margin_left = -w/2; 
    this.interactionCanvas.setAttribute('style', "position: absolute; left:0; top:0; z-index:" + 1000);
    this.interactionCanvas.style.zIndex = 1000;
    this.interactionCanvas.id = "interaction_canvas";


    this.interactionCanvas.addEventListener('mousewheel',function(event){
        mouseWheelHandler(event);
    });

    document.getElementById('canvas_container').contentDocument.body.appendChild(this.interactionCanvas);
    
    this.interactionCanvas.addEventListener('mousemove', function(event){
        mouseMoveInteractionLayer(event);
        
    });

    let that = this
    this.interactionCanvas.onmouseup = function(e){ that.interactionLayer_mouseup(e);};
    this.interactionCanvas.onmousedown = function(e){ that.interactionLayer_mousedown(e);};
    this.interactionCanvas.onmouseout = function(e){ that.interactionLayer_mouseout(e);};
    $("#canvas_container").contents().find("#interaction_canvas").data('scale', 1.);
    $("#canvas_container").contents().find("#interaction_canvas").data('orig_width', w);
    $("#canvas_container").contents().find("#interaction_canvas").data('orig_height', h);
     
};

Layer.prototype.imageLoaded = function(x,y) {
    this.canvas.style.left = x;
    this.canvas.style.right = y;
    this.canvas.width = this.backgroundImage.width;
    this.canvas.height = this.backgroundImage.height;

    if (!this.bkgroundInitialized){
        this.bkgroundInitialized = true;
        document.getElementById("canvas_container").height = $(window).height()*.7;
        document.getElementById("canvas_container").width = $(window).width()*.7;
    }
    
    // centers the canvas -- not sure if it affects reflow
    let margin_left = -this.backgroundImage.width/2; 
    this.canvas.setAttribute('style', "position: absolute; left:0; top:0; z-index:" + this.id);

    this.canvasContext = this.canvas.getContext("2d");
    this.canvasContext.drawImage(this.backgroundImage,0,0);
    this.addLayerToPanel();
    this.addInteractionLayer(0,0,this.canvas.width,this.canvas.height);
};

Layer.prototype.interactionLayer_mouseup = function (e) {
    
    canvas =  getSelectedCanvas();
    var pos = {clientX: e.clientX, clientY: e.clientY};
    if (canvas !== undefined)
        canvas.trigger("mouseup",[pos]);
};

Layer.prototype.interactionLayer_mousedown = function(e) {
    
    canvas =  getSelectedCanvas();
    var pos = {clientX: e.clientX, clientY: e.clientY};
    if (canvas !== undefined)
        canvas.trigger("mousedown",[pos]);
};

Layer.prototype.interactionLayer_mouseout = function(e) {
    //console.log("mouseout");
    canvas =  getSelectedCanvas();
    var pos = {clientX: e.clientX, clientY: e.clientY};
    if (canvas !== undefined)
        canvas.trigger("mouseout",[pos]);
};

Layer.prototype.mouseup = function (e, pos) {
    //console.log("mouseup");
    this.setMousePosition(pos);
    this.isMouseDown = false;
};

Layer.prototype.mousedown = function(e, pos) {
    //console.log("mousedown");
    this.setMousePosition(pos);
    this.lastX       = this.mouseX;
    this.lastY       = this.mouseY;
    this.isMouseDown = true;
};

Layer.prototype.mouseout = function(e, pos) {
    //console.log("OUT");
    this.setMousePosition(pos);
    this.isMouseDown = false;
};

Layer.prototype.mousemove = function(e, pos) {
   
    this.setMousePosition(pos);
    if(this.isMouseDown){
        if (!this.isBackground)
            this.draw();    
    }
};

Layer.prototype.setMousePosition = function(e) {
    var rect         = this.canvas.getBoundingClientRect();
    this.mouseX      = parseInt(e.clientX-rect.left);
    this.mouseY      = parseInt(e.clientY-rect.top);
};


// draws on the current canvas
Layer.prototype.draw = function() {
    this.canvas.getContext("2d").beginPath();
    //Context.beginPath();
    mode = this.annotationTool.mode;
    this.canvas.getContext("2d").lineWidth = $("#txt_brush_size").val();

    if (mode == PEN){
        this.canvas.getContext("2d").globalCompositeOperation="source-over";
        this.canvas.getContext("2d").moveTo(this.lastX,this.lastY);
        this.canvas.getContext("2d").lineTo(this.mouseX,this.mouseY);
        this.canvas.getContext("2d").strokeStyle = document.getElementById("html5colorpicker_" + this.id).value;
        this.canvas.getContext("2d").lineJoin = this.canvas.getContext("2d").lineCap = 'round';
        this.canvas.getContext("2d").stroke();  
    }
    else if (mode==ERASER){
      this.canvas.getContext("2d").globalCompositeOperation="destination-out";
      this.canvas.getContext("2d").arc(this.lastX,this.lastY,this.canvas.getContext("2d").lineWidth,0,Math.PI*2,false);
      //this.canvas.getContext("2d").endPath();
      this.canvas.getContext("2d").fill();
    }
    
    this.lastX = this.mouseX;
    this.lastY = this.mouseY;
};


 
//setup the position and the size of the canvas (x,y) top left corner in pixels
Layer.prototype.setupCanvas = function(x, y, w, h) {
    this.canvas.style.left = x;
    this.canvas.style.right = y;
    this.canvas.style.position = 'absolute';
    
    this.canvas.width = w;
    this.canvas.height = h;
    
    let margin_left = -w/2; 
    this.canvas.setAttribute('style', "position: absolute; left:0; top:0; z-index:" + this.id);
    this.canvas.style.zIndex = this.id;


    this.canvas.addEventListener('mousewheel',function(event){
        mouseWheelHandler(event);
    });

};
 
Layer.prototype.setupBackgroundLayer = function(filename) {
    this.backgroundImage.src = filename; 
};
 

 //adds the layer entry in the panel, also adds functionalities to each entry
Layer.prototype.addLayerToPanel = function(){
     
    //panel = document.getElementById("layers_panel");
    layer_item = document.createElement("div");
    layer_item.setAttribute("class", "info_layer");
    layer_item.id = "info_layer_" + this.id;

    color = "#"+((1<<24)*Math.random()|0).toString(16);
    if (this.isBackground){
        layer_item.innerHTML = "<hr><label contenteditable=\"true\" class=\"pull-left\">Background</label><div class=\"container\"></div>";
    }
    else{
        layer_item.innerHTML = "<hr><input type=\"color\" id=\"html5colorpicker_" + this.id +"\" value=\""+color +"\" style=\"width:25%;\">"+
        "<label class=\"pull-left\" contenteditable=\"true\">Layer " + this.id + "</label> <a id=\"remove_layer\" href=\"#\"><i class=\"fa fa-lg fa-trash pull-right\"></i></a>";
    }
    $("#layers_panel").prepend(layer_item);
    this.annotationTool.brushColor = color;
    //this needs to be done here, because these elements are added dynamically 
    this.setupHandlers();
    //enable events for the canvas only when the layer is selected in the panel
    this.canvas.style.pointerEvents = "none"; 

};


//sets up handlers for event on dynamic elements (info_layer)
Layer.prototype.setupHandlers = function() {
    //mouse hovering
    $(".info_layer").hover(function(){
        if (!$(this).data('clicked')){
           $(this).css("background-color", "#D6EAF8");    
        }
    }, function(){
        if (!$(this).data('clicked')){
            $(this).css("background-color", "white");
        }
    });

    //click
    $("#info_layer_"+this.id).click(function() {
        if (!$(this).data('clicked')){
            //disable all the other layers
            $(".info_layer").css("background-color", "white");
            $(".info_layer").data('clicked', false);
            //enable current layer
            $(this).css("background-color", "#AED6F1");
            $(this).data('clicked', true);
            $("#canvas_container").contents().find("#interaction_canvas").data('selected_layer_id', this.id);
            handleInfoLayerClicked(this.id);
        }
        else{
            $(this).css("background-color", "white");
            $(this).data('clicked', false);
            disableAllLayers();   
        }
    });
};
 
 
var annTool = new AnnotationTool();
 
// *************** EVENTS HANDLING ********************************
// wait until the DOM is loaded to declare DOM related callbacks
$(document).ready(function(){
 

 
    $('#tools_form input:radio').on('change', function() {
        clicked_radio_id = $('input[name=options]:checked', '#tools_form').attr("id"); 
        if (clicked_radio_id == "brush"){
            annTool.mode=PEN;
        }
        else if (clicked_radio_id == "eraser"){
            annTool.mode = ERASER;
        }
        // console.log(annTool.mode);
 
    });

   $("#remove_layer").click(function(){
       // console.log("Erase clicked");
   });
 
   $("#add_layer").click(function(){
       // console.log("Add layer");
       annTool.addNewLayer();
 
   });
 
    $("#plus").click(function(){
        annTool.increaseBrushSize();
        $("#txt_brush_size").val(String(annTool.brushSize+""));});
 
    $("#minus").click(function(){
        annTool.decreaseBrushSize();
        $("#txt_brush_size").val(String(annTool.brushSize+""));
    });
 
    $("#txt_brush_size").change(function(){
           let bsize = parseInt($("#txt_brush_size").val(),10);
           if (isNaN(bsize) || (bsize <= 0))
              $("#txt_brush_size").val(String(annTool.brushSize+""));
           else{
              annTool.brushSize = bsize;
              $("#txt_brush_size").val(String(annTool.brushSize+""));
           }
    });
 
 
    $("#btn_select").click(function(){
        //TODO: handle reloading of image. Remove canvas and reset layers
 
        //get the name of the current image
        var activeSlide = $('.active');
        currImg  = activeSlide.find('img').attr('src');
        // create background layer 
        annTool.layers[0] = new Layer(0,true, annTool);
        annTool.layers[0].setupBackgroundLayer(currImg);
        //enable add layer button
        $("#add_layer").toggleClass('disabled', false);
    });
 
    //enables all tooltips in the page
    $('[data-toggle="tooltip"]').tooltip();   


 // adding mouse scroll button functionality (change brush size)
    // bsize_element = document.getElementById('plus');
    // if (bsize_element.addEventListener) {
    //     // IE9, Chrome, Safari, Opera
    //     bsize_element.addEventListener("mousewheel", mouseWheelHandler, false);
    //     // Firefox
    //     bsize_element.addEventListener("DOMMouseScroll", mouseWheelHandler, false);
    // }
    // // IE 6/7/8
    // else bsize_element.attachEvent("onmousewheel", mouseWheelHandler);

});



function mouseWheelHandler(e) {
    // cross-browser wheel delta
    var e = window.event || e; // old IE support
    var delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail)));
        
    if (!e.altKey && !e.ctrlKey){
        if (delta > 0)
            annTool.increaseBrushSize();
        else
            annTool.decreaseBrushSize();
        $("#txt_brush_size").val(String(annTool.brushSize+""));
        //raise a mousemove on the interaction layer to update the cursor size
        var interactionEvent = new $.Event("mousemove");
        interactionEvent.clientX = e.clientX;
        interactionEvent.clientY = e.clientY;
        //forces update of the mouse cursor when the size changes   
        mouseMoveInteractionLayer(interactionEvent);
    }
    //zoom canvas
    else if (e.altKey){ //TODO: do this for all the layers 
        var newscale = 0;
        if (delta>0)
            newscale = $("#canvas_container").contents().find("#interaction_canvas").data('scale') + 0.10;
        else if (delta < 0){
            newscale = $("#canvas_container").contents().find("#interaction_canvas").data('scale') - 0.10;
            if (newscale < .1)
                newscale = 0.1;
        }

        newscale = (newscale);
        console.log(newscale);
      
        // let w = iframeDoc.getElementById("interaction_canvas").width;
        // let h = iframeDoc.getElementById("interaction_canvas").height;

        $("#canvas_container").contents().find("#interaction_canvas").data('scale', newscale);
        var iframeDoc = document.getElementById("canvas_container").contentWindow.document;
        var oldCanvas = annTool.layers[0].interactionCanvas.toDataURL("image/png");
        var img = new Image();
        img.src = oldCanvas;
        
        iframeDoc.getElementById("interaction_canvas").width = 
                iframeDoc.getElementById("interaction_canvas").width * newscale;
        iframeDoc.getElementById("interaction_canvas").height = 
                iframeDoc.getElementById("interaction_canvas").height * newscale;
        
        var ctx = annTool.layers[0].interactionCanvas.getContext("2d");
        ctx.save();
        ctx.scale(newscale,newscale);
        ctx.drawImage(img, 0, 0);
        ctx.restore();

        for (i = 0; i<annTool.layers.length; i++){
            if (i!=0){
                var oldCanvas = annTool.layers[i].canvas.toDataURL("image/png");
                var img = new Image();
                img.src = oldCanvas;
            }
           
            iframeDoc.getElementById("canvas_"+i).width = iframeDoc.getElementById("canvas_"+i).width * newscale;
            iframeDoc.getElementById("canvas_"+i).height = iframeDoc.getElementById("canvas_"+i).height * newscale;

            var ctx = annTool.layers[i].canvas.getContext("2d");
            if (i==0){
                ctx.save();
                ctx.scale(newscale,newscale);
                ctx.drawImage(annTool.layers[i].backgroundImage, 0, 0);
                ctx.restore();
            }
            else
                ctx.drawImage(img, 0, 0);
        //    $("#canvas_container").contents().find("#canvas_"+i).width($("#"+annTool.layers[i].name).width*newscale);
        //    $("#canvas_container").contents().find("#canvas_"+i).height($("#"+annTool.layers[i].name).height*newscale);
            // var ctx = annTool.layers[i].canvas.getContext("2d");
            // ctx.save();

            // let w = iframeDoc.getElementById("interaction_canvas").width;
            // let h = iframeDoc.getElementById("interaction_canvas").height;

            // var savedData = new Image();
            // if (i!=0)
            //     savedData.src = annTool.layers[i].canvas.toDataURL("image/png");
            //     //imageData = ctx.getImageData(0,0,w,h);
            // ctx.clearRect(0, 0, w, h);
            // ctx.scale(newscale,newscale);
            
            // if (i==0)
            //     ctx.drawImage(annTool.layers[i].backgroundImage, 0, 0);
            // else
            //     ctx.drawImage(savedData, 0, 0);

            // ctx.restore();
        }

        // var ctx = annTool.layers[0].canvas.getContext("2d");
        // ctx.save();
        // if (delta>0){
        //     let newscale = $("#interaction_canvas").data('scale') + 0.1;
        //     ctx.scale(newscale,newscale);
        //     $("#interaction_canvas").data('scale', newscale);
        // }
        // else{
        //     let newscale = $("#interaction_canvas").data('scale') - 0.1;
        //     if (newscale < .1)
        //         newscale = 0.1;
        //     ctx.scale(newscale,newscale);
        //     $("#interaction_canvas").data('scale', newscale);
        // }
        // ctx.drawImage(annTool.layers[0].backgroundImage,0,0);
        // ctx.restore();
    }
}

 
function handleInfoLayerClicked(idstring){
    var id = parseInt(idstring.slice(11, 100));
    // console.log("I got clicked :: " + id);
    var iframeDoc = document.getElementById("canvas_container").contentWindow.document;
    for (l = 0; l < annTool.layers.length; l++){
        if (l == id)
            iframeDoc.getElementById("canvas_"+l).style.pointerEvents = "all";
        else
            iframeDoc.getElementById("canvas_"+l).style.pointerEvents = "none";

    }
}

function disableAllLayers(){
    var iframeDoc = document.getElementById("canvas_container").contentWindow.document;
    for (l = 0; l < annTool.layers.length; l++)
        iframeDoc.getElementById("canvas_"+l).style.pointerEvents = "none";
    $("#canvas_container").contents().find("#interaction_canvas").data('selected_layer_id', -1);
}


//this function draws a brush cursors that changes size with the width 
function mouseMoveInteractionLayer(event){
    var iframeDoc = document.getElementById("canvas_container").contentWindow.document;
    ctx = iframeDoc.getElementById("interaction_canvas").getContext("2d");
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0,  iframeDoc.getElementById("interaction_canvas").width,  
                        iframeDoc.getElementById("interaction_canvas").height);

    r = parseInt(annTool.brushSize); // Radius of circle
   // console.log(r + " -- " + $("#txt_brush_size").val());

    var rect   = iframeDoc.getElementById("interaction_canvas").getBoundingClientRect();
    let x      = parseInt(event.clientX-rect.left);
    let y      = parseInt(event.clientY-rect.top);

    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x,y,r,0,Math.PI*2,false);
    //ctx.arc(x, y, r, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.stroke();

    //pass the event on to the selected layer
    var pos = {clientX: event.clientX, clientY: event.clientY};
    currCanvas = getSelectedCanvas();
    if (currCanvas !== undefined){
        //var id = (selID.slice(11, 100));
        currCanvas.trigger("mousemove", [pos]);
    }
}

//this function expects in input a string exactly like this: "selected_layer_ID" and returns the canvas with id ID
function getSelectedCanvas(){

    var selected_layer_id = $("#canvas_container").contents().find("#interaction_canvas").data('selected_layer_id');
    if (selected_layer_id !== undefined){
        var id = (selected_layer_id.slice(11, 100));
       return $("#canvas_container").contents().find("#canvas_"+id);
    }
    else return undefined;
}


 






//******************** NOTES and snippets *************************************************************
 
// function scaleImageData(imageData, scale) {
//   var scaled = c.createImageData(imageData.width * scale, imageData.height * scale);
 
//   for(var row = 0; row < imageData.height; row++) {
//     for(var col = 0; col < imageData.width; col++) {
//       var sourcePixel = [
//         imageData.data[(row * imageData.width + col) * 4 + 0],
//         imageData.data[(row * imageData.width + col) * 4 + 1],
//         imageData.data[(row * imageData.width + col) * 4 + 2],
//         imageData.data[(row * imageData.width + col) * 4 + 3]
//       ];
//       for(var y = 0; y < scale; y++) {
//         var destRow = row * scale + y;
//         for(var x = 0; x < scale; x++) {
//           var destCol = col * scale + x;
//           for(var i = 0; i < 4; i++) {
//             scaled.data[(destRow * scaled.width + destCol) * 4 + i] =
//               sourcePixel[i];
//           }
//         }
//       }
//     }
//   }
 
//   return scaled;
// }