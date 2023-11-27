<!-- 
  name: 选择器,
  author: Mino,
  date: '2023/10/30'
 -->
<template>
	<view class="picker-container">
		<view class="picker-content u-flex-fill" @click="handleOpen">
			<u-text :show="!checkedList.length" :text="placeholder" :color="mergedPlaceholderStyle.color"
				:size="mergedPlaceholderStyle.size" :line-height="mergedPlaceholderStyle.lineHeight"></u-text>

			<scroll-view v-show="checkedList.length" class="list" scroll-x>
				<!-- 多选、折叠 -->
				<template v-if="multiple && collapse">
					<view class="list-item" v-show="checkedList[0]">
						<u-tag :text="checkedList[0].raw[keyName]" :closable="!disabled" plain
							@close="handleDelete(checkedList[0].raw[keyId]);handleSave();" @click="handleOpen"> </u-tag>
					</view>
					<view class="list-item" v-if="checkedList.length > 1">
						<u-tag :text="'+' + (checkedList.length - 1)" plain @click="handleOpen"> </u-tag>
					</view>
				</template>
				<!-- 多选 -->
				<view v-else-if="multiple" class="list-item" v-for="item in checkedList" :key="item.raw[keyId]">
					<u-tag :text="item.raw[keyName]" :closable="!disabled" plain
						@close="handleDelete(item.raw[keyId]);handleSave();" @click="handleOpen"> </u-tag>
				</view>
				<!-- 单选 -->
				<view v-else class="list-item" v-for="item in checkedList" :key="item.raw[keyId]">
					<u-text :text="item.raw[keyName]" @click="handleOpen" />
				</view>
			</scroll-view>
		</view>

		<view class="picker-icon">
			<u-icon v-if="isClearable" name="close-circle-fill" @click="handleClear();handleSave();"></u-icon>
			<u-icon v-else :name="icon" @click="handleOpen"></u-icon>
		</view>

		<u-popup :show="visible" @close="handleClose">
			<view class="popup-header">
				<u-text :text="popupTitle" size="14" line-height="44" align="center"></u-text>
				<u-icon name="close" color="#666" bold @click="handleClose"></u-icon>
			</view>
			<view class="popup-search" v-show="filter">
				<u-search v-model="keywords" placeholder="输入关键字搜索" shape="round" :showAction="false"></u-search>
			</view>
			<view class="popup-content">
				<scroll-view scroll-y>
					<uni-list-item v-for="item in currentList" :key="item.raw[keyId]" :title="item.raw[keyName]"
						:clickable="isClickable(item)" :disabled="isDisabled(item)" @click="toggleCheck(item)">
						<template v-slot:footer>
							<view v-show="item.checked">
								<u-icon name="checkmark" size="17" color="#007aff" bold v-slot:footer></u-icon>
							</view>
						</template>
					</uni-list-item>
					<view v-show="!currentList.length" style="text-align: center;line-height:200px;"><text
							style="color: #999999">--暂无数据--</text></view>
				</scroll-view>
			</view>
			<view class="popup-footer u-flex" v-if="!disabled">
				<u-button type="info" plain text="取消" @click="handleClose"></u-button>
				<u-button type="primary" text="确认" @click="handleSave();handleClose();"></u-button>
			</view>
		</u-popup>
	</view>
</template>

<script>
	/**
	 * bd-picker 数据选择器 
	 * @description 数据选择器，通过列表选择数据
	 * @property {String | Array}	value		    	选中的数据。单选：id，多选：[id, id, ...]
	 * @property {Array}		 	options	    		所有的数据列表项。结构：{id, name, _disabled}[]
	 * @property {Object}		 	optionKeys			下拉列表数据的默认属性为id、name。若不一致，需配置optionKeys对应id、name对应的key
	 * @property {String}		 	icon				icon name。默认 arrow-right
	 * @property {String}		 	placeholder			占位提示语
	 * @property {Object}		 	placeholderStyle	占位提示语样式。Object类型，属性仅支持：color/size/lineHeight
	 * @property {String}		 	popupTitle			弹窗标题
	 * @property {Number}		 	multipleLimit		多选时最多可以选择的项目数，为 0 则不限制。默认 0
	 * @property {Boolean}		 	disabled			是否开启禁用，默认false
	 * @property {Boolean}		 	collapse			是否开启折叠，默认false
	 * @property {Boolean}		 	multiple			是否开启多选，默认false
	 * @property {Boolean}		 	clearable			是否开启清空，默认false
	 * @property {Boolean}		 	filter		    	是否开启过滤，默认false
	 * @event {Function}	     	change 				当value变动时会触发`change`事件
	 */
	/**
	 * @typedef {Object} DataItem 
	 * @property {Boolean} checked
	 * @property {Boolean} disabled
	 * @property {{id: String | Number, name: String}} raw
	 * @description 数据项类型
	 */
	export default {
		name: 'bd-picker',
		emits: ['change'],
		props: {
			value: {
				type: [String, Array],
			},
			options: {
				type: Array,
				default: () => ([])
			},
			optionKeys: {
				type: Object,
				default: () => ({})
			},
			icon: {
				type: String,
				default: "arrow-right",
			},
			placeholder: {
				type: String,
				default: "请选择"
			},
			placeholderStyle: {
				type: Object,
				default: () => ({})
			},
			popupTitle: {
				type: String,
				default: "请选择"
			},
			multipleLimit: {
				type: Number,
				default: 0,
			},
			disabled: {
				type: Boolean,
				default: false,
			},
			collapse: {
				type: Boolean,
				default: false,
			},
			multiple: {
				type: Boolean,
				default: false,
			},
			clearable: {
				type: Boolean,
				default: false,
			},
			filter: {
				type: Boolean,
				default: false,
			},
		},
		data() {
			return {
				// 关键字
				keywords: "",
				/**
				 * @type {DataItem[]} list
				 * @description 数据项列表
				 */
				list: [],
				/**
				 * @type {DataItem[]} checkedList
				 * @description 选中数据列表
				 */
				checkedList: [],
				// popup
				visible: false
			}
		},
		computed: {
			currentList() {
				return this.list.filter(u => u.raw?.[this.keyName]?.includes(this.keywords));
			},
			keyId() {
				return this.$props.optionKeys.id || "id";
			},
			keyName() {
				return this.$props.optionKeys.name || "name";
			},
			isClearable() {
				return !this.disabled && this.clearable && this.checkedList.length;
			},
			mergedPlaceholderStyle() {
				const defaultStyle = {
					color: "#C9C9C9",
					size: "26rpx",
					lineHeight: "26rpx"
				};
				return uni.$u.deepMerge(defaultStyle, this.$props.placeholderStyle);
			},
			isExceed() {
				if (!this.$props.multiple) return false;
				if (this.$props.multipleLimit == 0) return false;
				const selectionLength = this.list.filter(l => l.checked).length;
				if (selectionLength >= this.$props.multipleLimit) return true;
				return false;
			}
		},
		watch: {
			/**
			 * @param {String | String[]} newVal id或id数组
			 */
			value: {
				immediate: true,
				handler(newVal) {
					if (!newVal || !newVal.length) return void 0;
					const idArr = Array.isArray(newVal) ? newVal : newVal ? [newVal] : [];
					this.checkedList = idArr.map(id => ({
						checked: true,
						disabled: false,
						raw: {
							[this.keyId]: id,
							[this.keyName]: null
						}
					}))
					this.patchCheckedList();
					this.updateListStatus();
				}
			},
			options: {
				immediate: true,
				handler() {
					if (!this.$props.options?.length) return void 0;
					this.list = this.$props.options.map(opt => {
						return {
							checked: false,
							disabled: !!opt._disabled,
							raw: {
								[this.keyId]: opt[this.keyId],
								[this.keyName]: opt[this.keyName]
							}
						}
					})
					this.patchCheckedList();
					this.updateListStatus();
				}
			}
		},
		methods: {
			// 补充 keyName 字段
			patchCheckedList() {
				if (!this.checkedList.length || !this.list.length) return void 0;
				if (this.checkedList.every(c => !c.raw[this.keyName])) {
					this.checkedList.forEach(c => {
						const item = this.list.find(l => l.raw[this.keyId] == c.raw[this.keyId]);
						c.raw[this.keyName] = item?.raw[this.keyName];
					})
				}
			},
			// 更新option list的状态
			updateListStatus() {
				this.list.forEach(i => i.checked = this.checkedList.some(v => v.raw[this.keyId] == i.raw[this.keyId]))
			},
			// 切换状态
			toggleCheck(item) {
				const isTrue = !item.checked;
				if (this.multiple) {
					this.$set(item, "checked", isTrue);
				} else {
					this.handleClear();
					if (isTrue) {
						this.$set(item, "checked", isTrue);
					}
				}
			},
			// 全部取消选中
			handleClear() {
				this.list.forEach(i => i.checked = false);
			},
			// 删除
			handleDelete(targetId) {
				const target = this.list.find(i => i.raw[this.keyId] == targetId);
				target.checked = false;
			},
			// 保存
			handleSave() {
				this.checkedList = this.list.filter(u => u.checked);
				this.$emit("input", this.getCheckedID());
				this.$emit("change", this.getCheckedID(), this.getCheckedData());
			},
			handleOpen() {
				this.visible = true;
			},
			handleClose() {
				this.visible = false;
				this.updateListStatus();
			},
			// 获取选中的数据ID
			getCheckedID() {
				if (this.multiple) return this.checkedList.map(u => u.raw[this.keyId]);
				return this.checkedList.at(0)?.raw[this.keyId] || "";
			},
			// 获取选中的数据
			getCheckedData() {
				if (this.multiple) return this.checkedList.map(u => u.raw);
				return this.checkedList.at(0)?.raw || {};
			},
			// 数据项是否可以点击（即：触发click方法）
			isClickable(item) {
				const { checked, disabled: selfDisabled } = item;
				if (this.$props.disabled) return false;
				if (selfDisabled) return false;
				// 多选时，超出limit，checked为true时，允许点击，设置checked为false
				if (this.isExceed && !checked) return false;
				return true;
			},
			// 数据项的禁用样式（即：!isClickable(item)）
			isDisabled(item) {
				const { checked, disabled: selfDisabled } = item;
				if (this.$props.disabled) return true;
				if (selfDisabled) return true;
				if (this.isExceed && !checked) return true;
				return false;
			},
		},
		options: {
			styleIsolation: 'shared',
		}
	}
</script>

<style lang="scss" scoped>
	::v-deep .u-tag {
		margin-top: 0 !important;

		&__close {
			top: 0 !important;
			z-index: 1 !important;
		}
	}

	::v-deep .u-popup__content {
		border-radius: 10px 10px 0 0;
	}

	.picker-icon ::v-deep .u-icon {
		padding: 0 4px;
	}

	.picker-container {
		width: 100%;
		@extend .u-flex, .u-flex-items-center;
	}

	.picker-content {
		width: calc(100% - 24px);

		.list {
			width: 100%;
			height: 38px;
			line-height: 40px;
			white-space: nowrap;

			&-item {
				display: inline-block;
				margin-right: 10rpx;
			}
		}
	}

	.popup-header {
		position: relative;

		::v-deep .u-icon {
			position: absolute;
			top: 14px;
			right: 16px;
		}
	}

	.popup-search,
	.popup-footer {
		padding: 10px 15px;
	}

	.popup-content {
		scroll-view {
			height: 300px;
		}
	}
</style>