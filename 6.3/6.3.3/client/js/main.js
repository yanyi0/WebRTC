'use strict';

var localVideo = document.querySelector('#localVideo');
var remoteVideo = document.querySelector('#remoteVideo');
var localStream  = null;

var fishRTCEngine;
var FishRTCEngine = function(wsUrl){
    this.init(wsUrl);
    fishRTCEngine = this;
    return this;
}

FishRTCEngine.prototype.init = function(wsUrl){
    //设置wbsocket url
    this.wsUrl = wsUrl;
    //websocket对象
    this.signaling = null;
}

FishRTCEngine.prototype.createWebSocket = function(){
    fishRTCEngine = this;
    fishRTCEngine.signaling = new WebSocket(this.wsUrl);
    fishRTCEngine.signaling.onopen = function(){
        fishRTCEngine.onOpen();
    }

    fishRTCEngine.signaling.onmessage = function(ev){
        fishRTCEngine.onMessage(ev);
    }

    fishRTCEngine.signaling.onerror = function(ev){
        fishRTCEngine.onError(ev);
    }

    fishRTCEngine.signaling.onclose = function(ev){
        fishRTCEngine.onClose(ev);
    }
}

FishRTCEngine.prototype.onOpen = function(){
    console.log('websocket open');
}

FishRTCEngine.prototype.onMessage = function(event){
    console.log('websocket onMessage:'+event.data);
}

FishRTCEngine.prototype.onError = function(event){
    console.log('websocket onError' + event.data);
}

FishRTCEngine.prototype.onClose = function(event){
    console.log('websocket onClose code:' + event.code + ',reason:'+ EventTarget.reason);
}

function openLocalStream(stream){
    console.log('Open Local stream');
    localVideo.srcObject = stream;
    localStream = stream;
}

function initLocalStream(){
    navigator.mediaDevices.getUserMedia({
        audio:true,
        video:{
            width:640,
            height:480
        }
    })
        .then(openLocalStream)
        .catch(function(e) {
            alert("getUserMedia() error" + e.name);
        });
}

fishRTCEngine = new FishRTCEngine("ws://172.30.30.10:8099");
fishRTCEngine.createWebSocket();
document.getElementById('joinBtn').onclick = function(){
    console.log("加入按钮被点击");
    //初始化本地码流
    initLocalStream();
}