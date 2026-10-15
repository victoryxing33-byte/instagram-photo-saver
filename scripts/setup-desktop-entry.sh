#!/bin/bash
#
# 在桌面创建一个指向图片真实存放目录的入口（软链接）。
# 只创建入口，不搬动文件，也不改变文件真实位置。
#
# 用法:
#   ./setup-desktop-entry.sh                          # 桌面/"ins审美图" -> ~/Downloads/Instagram
#   ./setup-desktop-entry.sh "Ins 图片"                # 自定义入口名称
#   ./setup-desktop-entry.sh "Ins 图片" ~/Pictures/ins # 自定义名称和真实目录
#
set -euo pipefail

NAME="${1:-ins审美图}"
STORE="${2:-$HOME/Downloads/Instagram}"
ENTRY="$HOME/Desktop/$NAME"

mkdir -p "$STORE"

if [ -L "$ENTRY" ]; then
  ln -sfn "$STORE" "$ENTRY"
  echo "入口已存在，已重新指向 $STORE"
elif [ -e "$ENTRY" ]; then
  echo "中止：$ENTRY 是一个真实的文件或文件夹。" >&2
  echo "请先把它改名或移走，本脚本不会覆盖你已有的东西。" >&2
  exit 1
else
  ln -s "$STORE" "$ENTRY"
  echo "已创建：$ENTRY"
fi

ls -ld "$ENTRY"
echo
echo "注意：这个入口是软链接。删掉它不会删掉图片，图片还在 $STORE。"
