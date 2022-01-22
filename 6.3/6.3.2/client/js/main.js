'use strict';

var localVideo = document.querySelector('#localVideo');
var remoteVideo = document.querySelector('#remoteVideo');
var localStream  = null;

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

document.getElementById('joinBtn').onclick = function(){
    console.log("加入按钮被点击");
    //初始化本地码流
    initLocalStream();
}