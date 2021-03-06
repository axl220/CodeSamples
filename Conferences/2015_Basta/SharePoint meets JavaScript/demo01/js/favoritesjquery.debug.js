"use strict";
var Basta = Basta || {};

// controls
Basta.Controls = Basta.Controls || {};
Basta.Controls.Favorites = function(options) {
	this.options = options;
};
(function(favorites) {

	var createListItemControl = function(id, title, url) {
		var jLi = $basta.$('<li>', {'class':'favListItem', 'data-itemid':id});
		var jLink = $basta.$('<a>', {'class':'favLink', 'href':url}).html(title);
		jLi.append(jLink);
		var jDelete = $basta.$('<a>', {'class':'favLink favRemove _favRemove', 'data-itemid':id}).html('<span class=\'favIcon\'>Delete</span>')
		jLi.append(jDelete);

		return jLi;
	};

	favorites.createControl = function() {
		// create container
		var jContainer = $basta.$('<div>', {'class':'favoritesContainer _favoritesContainer stateClosed _stateClosed'});

		var jHeader = $basta.$('<div class=\'favBoxHeader\'><a class=\'favLink _favToggleBtn\'>+</a></div>');
		jContainer.append(jHeader);

		var jVerticalLabel = $basta.$('<div class=\'favLabel favVertical\'>Favorites</div>');
		jContainer.append(jVerticalLabel);

		var jAdd = $basta.$('<div>', {'class':'favLabel favAdd _favAdd'}).html('Add Basta link');
		jContainer.append(jAdd);

		var jBody = $basta.$('<div>', {'class':'favBoxBody'});
		jContainer.append(jBody);
		var jUl = $basta.$('<ul>', {'class':'favList'});
		jBody.append(jUl);

		// actions
		jHeader.on('click', '._favToggleBtn', function(evnt) {
			evnt.preventDefault();
			jContainer.toggleClass('stateClosed').toggleClass('stateOpened');
			var jHeaderLink = $basta.$(this);
			if(jContainer.hasClass('stateClosed')) {
				jHeaderLink.html('+');
			}
			else {
				jHeaderLink.html('Favorites');
			}
		});
		jAdd.on('click', function(evnt) {
			evnt.preventDefault();
			Basta.Data.FavoriteList.saveItem('Basta', 'http://www.basta.net', function(data) {
				jUl.append(createListItemControl(data.id, data.title, data.url));
			});
		});
		jContainer.on('click', '._favRemove', function(evnt) {
			evnt.preventDefault();
			var itemId = $basta.$(this).data('itemid');
			jContainer.trigger('deleteItem', [itemId]);
		});

		// custom event
		jContainer.on('deleteItem', function(evnt, itemId) {
			var id = itemId;
			if(typeof itemId == 'string') {
				id = parseInt(itemId);
			}

			var self = this;
			Basta.Data.FavoriteList.removeItem(id, function(data) {
				if(data.deleted) {
					$basta.$(self).find('.favListItem[data-itemid="' + data.id + '"]').remove();
				}
			});
		});

		// load data
		Basta.Data.FavoriteList.getItems(function(data) {
			$basta.$.each(data.items, function(idx, itm) {
				var listItemControl = createListItemControl(itm.id, itm.url.description, itm.url.url);
				jUl.append(listItemControl);
			});
		});

		return jContainer;
	};
})(Basta.Controls.Favorites.prototype);

// data
Basta.Data = Basta.Data || {};
Basta.Data.FavoriteList = Basta.Data.FavoriteList || {};
(function(favoriteList) {

	favoriteList.id = 'DFDA9DE5-3C3D-4F75-9AEC-BABBE7927C41';

	var getList = function(ctx) {
		var web =  ctx.get_web();
		var list = web.get_lists().getById(favoriteList.id);
		return list;
	};

	favoriteList.saveItem = function (title, url, callback) {
		ExecuteOrDelayUntilScriptLoaded(function() {
			var ctx = SP.ClientContext.get_current();
			var list = getList(ctx);

			// create item
			var linkItemInfo = new SP.ListItemCreationInformation();
			var listItem = list.addItem(linkItemInfo);
			var urlValue = new SP.FieldUrlValue();
			urlValue.set_url(url);
			urlValue.set_description(title);
			listItem.set_item('URL', urlValue);
			listItem.update();
			ctx.load(listItem);

			// throw data back
			var callbackData = {};
			ctx.executeQueryAsync(function(sender, args) {
				callbackData.id = listItem.get_id();
				callbackData.title = title;
				callbackData.url = url;
				callback(callbackData);
			}, function(sender, args) {
				console.log('error');
			});
		}, 'sp.js');
	};

	favoriteList.removeItem = function(itemId, callback) {
		ExecuteOrDelayUntilScriptLoaded(function() {
			var ctx = SP.ClientContext.get_current();
			var list = getList(ctx);

			var item = list.getItemById(itemId);
			item.deleteObject();

			var callbackData = { id : itemId };
			ctx.executeQueryAsync(function(sender, args) {
				callbackData.deleted = true;
				callback(callbackData);
			}, function(sender, args) {
				console.log('error');
			});

		}, 'sp.js');
	};

	favoriteList.getItems = function(callback) {
		ExecuteOrDelayUntilScriptLoaded(function() {
			var ctx = SP.ClientContext.get_current();
			var list = getList(ctx);

			// get list items
			var camlQuery = new SP.CamlQuery();
			var items = list.getItems(camlQuery);
			ctx.load(items);

			var callbackData = {};
			ctx.executeQueryAsync(function(sender, args) {
				callbackData.items = [];

				var itemsEnumerator = items.getEnumerator();
				while(itemsEnumerator.moveNext()) {
					var cItem = itemsEnumerator.get_current();

					// create dump nice object
					var urlFieldValue = cItem.get_item('URL');
					callbackData.items.push({
						id: cItem.get_id(),
						url: {
							url: urlFieldValue.get_url(),
							description: urlFieldValue.get_description()
						}
					});
				}

				callback(callbackData);
			}, function(sender, args) {
				console.log('error');
			});
		}, 'sp.js');
	};

})(Basta.Data.FavoriteList);


// create control on default.aspx
if(window.location.toString().indexOf('basta01/') == -1) {
	var favorites = new Basta.Controls.Favorites();
	$basta.$('#s4-workspace').prepend(favorites.createControl());
}