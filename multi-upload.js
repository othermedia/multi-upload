MultiUpload = new JS.Class({
  initialize: function(container, endpoint, settings) {
    this._container = Ojay(container);
    this._endpoint = endpoint;
    this._container.insert(this.getHTML(), 'after');
    this.setup(settings);
  },
  
  getHTML: function() {
    if (this._html) return this._html;
    var self = this;
    this._html = Ojay( Ojay.HTML.div({className: this.klass.CONTAINER_CLASS}, function(h) {
      self._buttonPlaceholder = h.div();
    }) );
    return this._html;
  },
  
  setup: function(settings) {
    this._getSWFUpload(settings);
  },
  
  _getSWFUpload: function(settings) {
    if (this._swfu) return this._swfu;
    
    var flashUrl = this.klass.FLASH_URL;
    if (!flashUrl) throw 'MultiUpload.FLASH_URL must specify SWFUpload .swf URL';
    
    var settings = settings || {},
        button   = settings.button || {},
        m        = this.method('method'),
        k        = this.klass;
    
    return this._swfu = new SWFUpload({
      flash_url:                flashUrl,
      upload_url:               this._endpoint,

      file_size_limit:          settings.sizeLimit || k.SIZE_LIMIT,
      file_types:               settings.fileTypes || k.FILE_TYPES,
      file_types_description:   settings.fileDescription || k.FILE_DESCRIPTION,
      file_queue_limit:         0,

      debug:                    false,

      button_placeholder:       this._buttonPlaceholder,
      button_width:             button.width  || k.BUTTON_WIDTH,
      button_height:            button.height || k.BUTTON_HEIGHT,

      button_text:              '<span class="mu-button-text">' + 
                                (button.text   || k.BUTTON_TEXT) +
                                '</span>',

      button_text_style:        '.mu-button-text {' +
                                (button.style  || k.BUTTON_TEXT_STYLE) + '}',

      button_text_left_padding: button.leftPadding || k.BUTTON_TEXT_LEFT_PADDING,
      button_text_top_padding:  button.topPadding  || k.BUTTON_TEXT_TOP_PADDING,

      file_queued_handler:          m('_fileQueued'),
      file_queue_error_handler:     m('_fileQueueError'),
      file_dialog_complete_handler: m('_fileDialogComplete'),
      upload_start_handler:         m('_uploadStart'),
      upload_progress_handler:      m('_uploadProgress'),
      upload_error_handler:         m('_uploadError'),
      upload_success_handler:       m('_uploadSuccess'),
      upload_complete_handler:      m('_uploadComplete')
    });
  },
  
  _fileQueued: function() {},
  _fileQueueError: function() {},
  _fileDialogComplete: function() {},
  _uploadStart: function() {},
  _uploadProgress: function() {},
  _uploadError: function() {},
  _uploadSuccess: function() {},
  _uploadComplete: function() {},
  _queueComplete: function() {},
  
  extend: {
    CONTAINER_CLASS:    'multi-upload',
    FLASH_URL:          null,
    
    SIZE_LIMIT:         0,
    FILE_TYPES:         '*.*',
    FILE_DESCRIPTION:   'All files',
    
    BUTTON_WIDTH:       150,
    BUTTON_HEIGHT:      50,
    BUTTON_TEXT:        'Browse',
    BUTTON_TEXT_STYLE:  'font-size: 24px;',
    BUTTON_TEXT_LEFT_PADDING: 12,
    BUTTON_TEXT_TOP_PADDING:  3
  }
});

