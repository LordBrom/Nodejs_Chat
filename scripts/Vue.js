Vue.component('message-normal', {
  template:
  '<li class="chatMessage" v-html="commentpost.msg" v-bind:title="commentpost.timestamp" v-bind:style="commentpost.style"  > {{ commentpost.msg }} </li>',
  props: ['commentpost']
});


var chatWindow = new Vue({
	el: '#chatContainer',
	data: {
		username: '',
		messages: [],
		messageBox : ''
	},
	methods: {
		addMessage: function () {
			this.sendMessage(this.messageBox)
			this.messageBox = ''
		},
		sendMessage: function() {return 0}
	}
});