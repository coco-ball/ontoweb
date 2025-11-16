import headerImg from "../assets/headerImg.png";

export default function Header() {
  return (
    <div className="header-container">
      <p className="header-kr">
        온타라의 온토웹(OntoWeb)은 현실의 공간에 실존하는 웹입니다.
        <br />
        감각적인 질감과 인터랙션을 통해 디지털과 현실이 혼합된 새로운 웹 경험을
        제시합니다.
        <br />
        <br />
        온토웹에서는 아래와 같은 경험을 만나볼 수 있습니다.
      </p>
      <p className="header-eng">
        ONTARA’s OntoWeb is a web that exists within physical space.
        <br />
        Through sensory textures and interactions, it presents a new web
        experience where the digital and the real merge into one.
        <br />
        <br />
        You can experience the following in OntoWeb.
      </p>
      <div className="header-img">
        <img src={headerImg} alt="logo-image"></img>
      </div>
    </div>
  );
}
