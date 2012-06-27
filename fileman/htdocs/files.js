
var conf = {
	getlist: 'proc/files',
	upload: 'proc/upload',
	remove: 'proc/delete',
	download: 'proc/archive'
};

$(function() {
	var current = null;
	var sorttype = { field: 'name', order: false };

	// ファイル一覧取得
	var getlist = function() {
		$.getJSON(conf.getlist, updatelist);
	};

	// ファイル一覧表示更新
	var updatelist = function(data) {
		// チェックを残す
		var checks = getchecks();

		// データ更新
		if (data) {
			current = data;
		}
		sortdata();
		updateheader();

		// ファイル表示を作る
		var $files = $('#files');
		$files.empty();
		$.each(current.files, function(index, value) {
			var $row = createitem(value);
			if (checks.indexOf(value.name) >= 0) {
				// チェックを付ける
				//$row.click();
				$row.find('input.filecheck').prop('checked', true);
			}
			$files.append($row);
		});
		updateoperation();

		// 表示調整
		$('#files').css('padding-top', $('#operator').height() - $('#files').offset().top);
	};

	// リストソート
	var sortlist = function(field, order) {
		if (field) {
			sorttype.field = field;
			sorttype.order = order;
		}

		// 再表示
		updatelist();
	};

	// 実際の並べ替え
	var sortdata = function() {
		current.files.sort(function(a, b) {
			return (a[sorttype.field] < b[sorttype.field]) ? -1 : 1;
		});
		if (sorttype.order) {
			current.files.reverse();
		}
	};

	// へッダ更新
	var updateheader = function(item) {
		var $row = $('#header').empty().addClass('headerrow');

		// チェックボックス領域
		$row.append($('<span>').addClass('filecheck'));

		var createlink = function(field, title) {
			var mark = (sorttype.field == field) ? (!sorttype.order ? '▲' : '▼') : '';
			return $('<a>').text(title + mark).attr('href', '#').click(function() {
				sortlist(field, (sorttype.field == field) && !sorttype.order);
				return false;
			});
		};

		// ファイル名
		$row.append($('<span>').addClass('filename').append(createlink('name', 'ファイル名')));

		// ファイルサイズ
		$row.append($('<span>').addClass('filesize').append(createlink('size', 'サイズ')));

		// タイムスタンプ
		$row.append($('<span>').addClass('filemtime').append(createlink('mtime', 'タイムスタンプ')));
	};

	// ファイル表示作成
	var createitem = function(item) {
		var $row = $('<div>').addClass('filerow');

		// チェックボックス
		var $check = $('<input type="checkbox">').addClass('filecheck').click(function(e) {
			setTimeout(updateoperation, 10);
			e.stopPropagation();
		});
		$row.append($('<span>').addClass('filecheck').append($check));

		// ファイル名リンク
		var url = current.url + item.name;
		var $a = $('<a>').attr('href', url).attr('target', '_blank').text(item.name)
			.click(function(e) { e.stopPropagation(); });
		$row.append($('<span>').addClass('filename').append($a));

		// ファイルサイズ
		$row.append($('<span>').addClass('filesize').text(sizeformat(item.size)));

		// タイムスタンプ
		$row.append($('<span>').addClass('filemtime').text(dateformat(item.mtime)));

		// クリックイベント
		$row.click(function() {
			$(this).find('input.filecheck').click();
		});
		return $row;
	};

	// チェックされたファイル項目を取得
	var getchecks = function() {
		var result = [];
		$('input.filecheck').each(function(index, item) {
			if ($(item).prop('checked')) {
				result.push(current.files[index].name);
			}
		});
		return result;
	};

	// 操作領域の表示切り替え
	var updateoperation = function() {
		var items = $('input.filecheck').length;
		var checks = getchecks().length;

		if (checks > 0) {
			$('#operation1').hide();
			$('#operation2').show();
		} else {
			$('#operation1').show();
			$('#operation2').hide();
		}

		$('#selectallbtn').prop('disabled', (items == checks));
		$('#deselectallbtn').prop('disabled', (checks == 0));
	};

	// ファイルサイズ表示作成
	var sizeformat = function(value) {
		if (value < 10*1000) {
			return intcomma(value) + ' B';
		} else {
			return intcomma(Math.floor(value / 1000)) + '.' + Math.floor(value / 100 % 10) + ' KB';
		}
	};

	// コンマを付ける
	var intcomma = function(value) {
		var prev = '' + value;
		while ((value = prev.replace(/(\d+)(\d{3})(?!\d)/, '$1,$2')) != prev) {
			prev = value;
		}
		return value;
	};

	// 日付表示作成
	var dateformat = function(timestamp) {
		var date = new Date();
		date.setTime(timestamp * 1000);
		return date.getFullYear() + '-'
			+ ('00' + (date.getMonth() + 1)).slice(-2) + '-'
			+ ('00' + date.getDate()).slice(-2) + ' '
			+ ('00' + date.getHours()).slice(-2) + ':'
			+ ('00' + date.getMinutes()).slice(-2) + ':'
			+ ('00' + date.getSeconds()).slice(-2);
	};

	// 初回ファイル一覧取得
	getlist();

	// ファイルアップロード処理
	var uploadfiles = function(files) {
		// FormDataオブジェクト
		var data = new FormData();

		// ファイル情報を追加する
		var newfile = [], overwrite = [], ignore = [];
		$.each(files, function(index, file) {
			var filename = file.name;
			if (filename.search(/^\.|[^0-9A-Za-z\._-]/) >= 0) {
				ignore.push(filename)
			} else {
				data.append('files', file);
				if (isexists(filename)) {
					overwrite.push(filename);
				} else {
					newfile.push(filename);
				}
			}
		});

		// 確認アラート
		var msg = '';
		if (overwrite.length > 0) {
			msg += '次のファイルを上書きします\n' + overwrite.join('\n') + '\n\n';
		}
		if (newfile.length > 0) {
			msg += '次のファイルを新規登録します\n' + newfile.join('\n') + '\n\n';
		}
		if (ignore.length > 0) {
			msg += '次のファイルは無視されます\n(ファイル名に半角英数字と ._- 以外の文字は使えません)\n'
				+ ignore.join('\n');
		}

		if (overwrite.length + newfile.length > 0) {
			// アップロードするファイルがひとつでもある
			if ((!isconfirm() && ignore.length == 0) || confirm(msg)) {
				// アップロード
				_sendfile(data);
			}
		} else if (msg != '') {
			alert(msg);
		}
	};

	// アップロード本体
	var _sendfile = function(data) {
		$.ajax({
			type: 'POST',
			url: conf.upload,
			data: data,
			processData: false,
			contentType: false,

			dataType: 'json',
			success: ajaxresult
		});
	};

	// Ajax結果処理
	var ajaxresult = function(result) {
		if (result.success) {
			// 再読み込み
			getlist();
		}
		if (result.message && (isresult() || !result.success/*エラー時は必ずアラート*/)) {
			alert(result.message);
		}
	};

	// ファイル既存判定
	var isexists = function(filename) {
		var exists = false;
		$.each(current.files, function(index, value) {
			if (value.name == filename) {
				exists = true;
				return false;
			}
		});
		return exists;
	}

	// ファイル選択フォームからの入力
	$('#uploadform').bind('change', function() {
		// 選択されたファイル情報を取得
		var files = this.files;
		uploadfiles(files);
	});

	// ドラッグドロップからの入力
	var $body = $(window);
	$body.bind('drop', function(e) {
		$('#dropinfo').hide();
		// ドラッグされたファイル情報を取得
		var files = e.originalEvent.dataTransfer.files;
		uploadfiles(files);
		return false;	// デフォルトの処理を実行しない
	});
	var dragging = function(e) {
		$('#dropinfo').show()
			.css('left', (e.originalEvent.x || e.originalEvent.layerX) + 1)
			.css('top',  (e.originalEvent.y || e.originalEvent.layerY) + 1);
		return false;	// デフォルトの処理を実行しない
	};
	$body.bind('dragenter', dragging);
	$body.bind('dragover', dragging);
	$body.bind('dragleave', function(e) {
		$('#dropinfo').hide();
		return false;	// デフォルトの処理を実行しない
	});

	// 全て選択
	$('#selectallbtn').click(function() {
		$('input.filecheck').prop('checked', true);
		updateoperation();
	});

	// 全て選択解除
	$('#deselectallbtn').click(function() {
		$('input.filecheck').prop('checked', false);
		updateoperation();
	});

	// 削除
	$('#deletebtn').click(function() {
		var checks = getchecks();
		if (checks.length > 0) {
			if (!isconfirm() || confirm('ファイルを削除します\n' + checks.join('\n'))) {
				$.post(conf.remove, { files:checks }, ajaxresult, 'json');
			}
		}
	});

	// ダウンロード
	$('#downloadbtn').click(function() {
		var checks = getchecks();
		if (checks.length > 0) {
			var $form = $('<form>').attr('action', conf.download);
			$.each(checks, function(index, filename) {
				$form.append($('<input>').attr('type', 'hidden').attr('name', 'file').val(filename));
			});
			$(document.body).append($form);
			$form.submit();
			$form.remove();
		}
	});

	// 再読み込み
	$('#refreshbtn').click(function() {
		getlist();
	});

	// 確認アラート表示要否
	var isconfirm = function() {
		return $('#confirmcheck').prop('checked');
	};

	// 結果アラート表示要否
	var isresult = function() {
		return $('#resultcheck').prop('checked');
	};
});

