import React from "react";
import "./player-hud.css";

export default function PlayerHUD({
  hp = 20,
  maxHp = 20,
  avatar = "/avatar.png",
}) {
  const percent = hp / maxHp;

  return (
    <div className="player-hud">

      {/* 左：头像 */}
      <div className="avatar-frame">
        <img src={avatar} className="avatar-img" />
      </div>

      {/* 右：血量球 */}
      <div className="hp-orb">
        <div
          className="hp-fill"
          style={{ transform: `scaleY(${percent})` }}
        />
        <div className="hp-glass" />
        <span className="hp-text">{hp}</span>
      </div>

    </div>
  );
}