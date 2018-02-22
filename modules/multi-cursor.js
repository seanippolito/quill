DEFAULTS = {
  template: `<span class="ql-cursor-flag">
               <span class="ql-cursor-name"></span>
             </span>
             <span class="ql-cursor-caret"></span>`,
  timeout: 2500
};

class MultiCursor {
  constructor(quill, options) {
    this.quill = quill;
    this.options = Object.assign({}, DEFAULTS, options);
    this.container = quill.addContainer('ql-multi-cursor');
    this.cursors = {};
    quill.on('text-change', this.applyDelta.bind(this));
  }

  clearCursors() {
    Object.keys(this.cursors).forEach(this.removeCursor.bind(this));
  }

  moveCursor(userId, index) {
    var cursor = this.cursors[userId];
    if(cursor) {
      cursor.index = index;
      cursor.elem.classList.remove('ql-hidden');
      clearTimeout(cursor.timer);
      cursor.timer = setTimeout(() => {
        cursor.elem.classList.add('ql-hidden');
        cursor.timer = null;
      }, this.options.timeout);
      this.updateCursor(cursor);
      return cursor;
    }
  }

  removeCursor(userId) {
    var cursor = this.cursors[userId];
    if(cursor) {
      cursor.elem.parentNode.removeChild(cursor.elem);
    }
    delete this.cursors[userId];
  }

  setCursor(userId, index, name, color) {
    if(!this.cursors[userId]) {
      var cursor = {
        userId: userId,
        index: index,
        color: color,
        elem: this.buildCursor(name, color)
      }
      this.cursors[userId] = cursor;
    }
    setTimeout(() => {
      this.moveCursor(userId, index);
    }, 1);
    return this.cursors[userId];
  }

  shiftCursors(index, length, authorId = null) {
    Object.values(this.cursors).forEach((cursor) => {
      var shift = Math.max(length, index - cursor.index);
      if(cursor.userId == authorId) {
        this.moveCursor(authorId, cursor.index + shift);
      } else if(cursor.index > index) {
        cursor.index += shift;
      }
    });
  }

  update() {
    Object.values(this.cursors).forEach(this.updateCursor.bind(this));
  }

  applyDelta(delta) {
    var index = 0;
    delta.ops.forEach((op) => {
      var length = 0;
      if (op.insert) {
        length = op.insert.length || 1;
        var author = op.attributes ? op.attributes.author : null;
        this.shiftCursors(index, length, author);
      } else if(op.delete) {
        this.shiftCursors(index, -1*op.delete, null);
      } else if(op.retain) {
        this.shiftCursors(index, 0, null);
        length = op.retain;
      }
      index += length;
    });
    this.update();
  }

  buildCursor(name, color) {
    var cursorEl = document.createElement('span');
    cursorEl.classList.add('ql-cursor');
    cursorEl.innerHTML = this.options.template;
    var cursorFlag = cursorEl.querySelector('.ql-cursor-flag');
    var cursorName = cursorEl.querySelector('.ql-cursor-name');
    var nameTextNode = document.createTextNode(name);
    cursorName.appendChild(nameTextNode);
    var cursorCaret = cursorEl.querySelector('.ql-cursor-caret');
    cursorCaret.style.backgroundColor = cursorName.style.backgroundColor = color;
    this.container.appendChild(cursorEl);
    return cursorEl;
  }

  updateCursor(cursor) {
    var bounds = this.quill.getBounds(cursor.index);
    if(bounds) {
      cursor.elem.style.top = (bounds.top + this.quill.container.scrollTop) + 'px';
      cursor.elem.style.left = bounds.left + 'px';
      cursor.elem.style.height = bounds.height + 'px';
      var flag = cursor.elem.querySelector('.ql-cursor-flag');
      cursor.elem.classList.toggle('ql-top', parseInt(cursor.elem.style.top) <= flag.offsetHeight);
      cursor.elem.classList.toggle('ql-left', parseInt(cursor.elem.style.left) <= flag.offsetWidth);
      cursor.elem.classList.toggle('ql-right', this.quill.root.offsetWidth - parseInt(cursor.elem.style.left) <= flag.offsetWidth);
    } else {
      this.removeCursor(cursor.userId);
    }
  }

}
