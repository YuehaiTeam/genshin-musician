{
  "targets": [
    {
      "target_name": "keybd_event",
      "sources": [ "keybd_event.cc" ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      'defines': [ 'NAPI_DISABLE_CPP_EXCEPTIONS',"_UNICODE", "UNICODE" ],
    }
  ]
}