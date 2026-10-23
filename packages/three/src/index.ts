export interface MugPreviewOptions {
  /** Accessible instructions for the rotatable preview. */
  ariaLabel?: string;
  /** Physical dimensions in millimeters. */
  diameter?: number;
  height?: number;
  color?: string;
  handleColor?: string;
  artworkUrl?: string;
  /** Wrap width as a fraction of the full circumference. Default 0.85. */
  wrapFraction?: number;
  /** Artwork height in millimeters; defaults to 85% of mug height. */
  artworkHeight?: number;
  /** Start angle in radians around the mug vertical axis. */
  wrapStart?: number;
  onUnavailable?: (error: Error) => void;
}
export interface MugPreview {
  /** Updates accessibility instructions without changing artwork or camera state. */
  setAriaLabel(label: string): void;
  /**
   * Loads and applies new artwork, releasing the replaced texture.
   *
   * @param url - Browser-accessible artwork image URL.
   * @returns Completion of texture loading; resource errors reject the promise.
   * @remarks
   * Discards a late load if newer artwork was requested or the preview was disposed.
   */
  setArtwork(url: string): Promise<void>;
  /**
   * Sets the mug's rotation around its vertical axis and renders the preview.
   *
   * @param radians - Absolute rotation angle in radians.
   */
  setRotation(radians: number): void;
  /**
   * Releases textures, geometry, materials, event listeners and the renderer.
   *
   * @remarks
   * Safe to call more than once; pending artwork loads discard their textures.
   */
  dispose(): void;
}

/**
 * Loads Three.js and mounts an interactive straight-sided mug visualization.
 *
 * @param container - Browser element containing the renderer and observed for size changes.
 * @param options - Physical mug dimensions, appearance, artwork and availability callback.
 * @returns A preview handle, or `null` after `onUnavailable` reports renderer or initial artwork failure.
 * @throws RangeError - If dimensions are invalid or the wrap fraction is outside (0, 1].
 *
 * @remarks
 * Dimensions use millimeters; angles use radians. Call `dispose` on unmount. The host
 * should offer a flat preview when initialization returns `null`. Module-loading errors reject.
 */
export const mountMugPreview = async (
  container: HTMLElement,
  options: MugPreviewOptions = {},
): Promise<MugPreview | null> => {
  const THREE = await import("three");
  const diameter = options.diameter ?? 82;
  const height = options.height ?? 95;
  const wrapFraction = options.wrapFraction ?? 0.85;
  if (
    ![diameter, height].every((value) => Number.isFinite(value) && value > 0) ||
    !(wrapFraction > 0 && wrapFraction <= 1)
  )
    throw new RangeError("Mug dimensions must be positive and wrap fraction in (0,1].");
  let renderer: InstanceType<typeof THREE.WebGLRenderer>;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch (error) {
    options.onUnavailable?.(error instanceof Error ? error : new Error(String(error)));
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.domElement.setAttribute("role", "img");
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute(
    "aria-label",
    options.ariaLabel ??
      "Rotatable mug preview. Drag or use arrow keys to rotate; scroll or press plus/minus to zoom.",
  );
  renderer.domElement.style.touchAction = "none";
  container.append(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 1, 2000);
  const mug = new THREE.Group();
  scene.add(mug);
  const ceramic = new THREE.MeshStandardMaterial({
    color: options.color ?? "#ffffff",
    roughness: 0.25,
    metalness: 0,
  });
  const bodyGeometry = new THREE.CylinderGeometry(diameter / 2, diameter / 2, height, 96, 1, true);
  mug.add(new THREE.Mesh(bodyGeometry, ceramic));
  const rimGeometry = new THREE.TorusGeometry(diameter / 2 - 1.2, 1.2, 12, 96);
  const rim = new THREE.Mesh(rimGeometry, ceramic);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = height / 2;
  mug.add(rim);
  const interiorGeometry = new THREE.CylinderGeometry(
    diameter / 2 - 2.4,
    diameter / 2 - 2.4,
    height - 3,
    96,
    1,
    true,
  );
  const interiorMaterial = ceramic.clone();
  interiorMaterial.side = THREE.BackSide;
  mug.add(new THREE.Mesh(interiorGeometry, interiorMaterial));
  const baseGeometry = new THREE.CylinderGeometry(diameter / 2, diameter / 2, 3, 96);
  const base = new THREE.Mesh(baseGeometry, ceramic);
  base.position.y = -height / 2 + 1.5;
  mug.add(base);
  const handleGeometry = new THREE.TorusGeometry(
    height * 0.24,
    diameter * 0.055,
    16,
    64,
    Math.PI * 1.6,
  );
  const handleMaterial = new THREE.MeshStandardMaterial({
    color: options.handleColor ?? options.color ?? "#ffffff",
    roughness: 0.25,
  });
  const handle = new THREE.Mesh(handleGeometry, handleMaterial);
  handle.position.x = diameter / 2 + height * 0.09;
  handle.rotation.z = -Math.PI * 0.8;
  mug.add(handle);
  // A physical wrap starts and ends beside the handle. Cylinder UVs follow the artwork's x coordinate.
  const wrapGeometry = new THREE.CylinderGeometry(
    diameter / 2 + 0.08,
    diameter / 2 + 0.08,
    options.artworkHeight ?? height * 0.85,
    128,
    1,
    true,
    options.wrapStart ?? Math.PI * (1 - wrapFraction),
    Math.PI * 2 * wrapFraction,
  );
  const wrapMaterial = new THREE.MeshStandardMaterial({
    transparent: true,
    roughness: 0.3,
    depthWrite: false,
  });
  const wrap = new THREE.Mesh(wrapGeometry, wrapMaterial);
  mug.add(wrap);
  wrap.visible = false;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x777777, 3));
  const light = new THREE.DirectionalLight(0xffffff, 3);
  light.position.set(150, 200, 200);
  scene.add(light);
  let distance = Math.max(height, diameter) * 3;
  let disposed = false;
  let request = 0;
  let textureRevision = 0;
  const render = () => {
    if (disposed) return;
    camera.position.set(0, height * 0.3, distance);
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  };
  const resize = () => {
    const width = Math.max(1, container.clientWidth),
      viewHeight = Math.max(1, container.clientHeight || width);
    renderer.setSize(width, viewHeight);
    camera.aspect = width / viewHeight;
    camera.updateProjectionMatrix();
    render();
  };
  const observer = new ResizeObserver(() => {
    cancelAnimationFrame(request);
    request = requestAnimationFrame(resize);
  });
  observer.observe(container);
  let pointer: { id: number; x: number } | undefined;
  const down = (event: PointerEvent) => {
    pointer = { id: event.pointerId, x: event.clientX };
    renderer.domElement.setPointerCapture(event.pointerId);
  };
  const move = (event: PointerEvent) => {
    if (!pointer || pointer.id !== event.pointerId) return;
    mug.rotation.y += (event.clientX - pointer.x) * 0.01;
    pointer.x = event.clientX;
    render();
  };
  const up = () => {
    pointer = undefined;
  };
  const wheel = (event: WheelEvent) => {
    event.preventDefault();
    distance = Math.max(height * 1.6, Math.min(height * 6, distance + event.deltaY * 0.1));
    render();
  };
  const key = (event: KeyboardEvent) => {
    if (!["ArrowLeft", "ArrowRight", "+", "-", "="].includes(event.key)) return;
    event.preventDefault();
    if (event.key === "ArrowLeft" || event.key === "ArrowRight")
      mug.rotation.y += event.key === "ArrowLeft" ? -0.15 : 0.15;
    else
      distance = Math.max(
        height * 1.6,
        Math.min(height * 6, distance + (event.key === "-" ? 10 : -10)),
      );
    render();
  };
  renderer.domElement.addEventListener("keydown", key);
  renderer.domElement.addEventListener("pointerdown", down);
  renderer.domElement.addEventListener("pointermove", move);
  renderer.domElement.addEventListener("pointerup", up);
  renderer.domElement.addEventListener("pointercancel", up);
  renderer.domElement.addEventListener("wheel", wheel, { passive: false });
  const preview: MugPreview = {
    setAriaLabel(label) {
      if (!disposed) renderer.domElement.setAttribute("aria-label", label);
    },
    async setArtwork(url) {
      const revision = ++textureRevision;
      const texture = await new THREE.TextureLoader().loadAsync(url);
      texture.colorSpace = THREE.SRGBColorSpace;
      if (disposed || revision !== textureRevision) {
        texture.dispose();
        return;
      }
      wrapMaterial.map?.dispose();
      wrapMaterial.map = texture;
      wrapMaterial.needsUpdate = true;
      wrap.visible = true;
      render();
    },
    setRotation(radians) {
      mug.rotation.y = radians;
      render();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      textureRevision++;
      observer.disconnect();
      cancelAnimationFrame(request);
      renderer.domElement.removeEventListener("keydown", key);
      renderer.domElement.removeEventListener("pointerdown", down);
      renderer.domElement.removeEventListener("pointermove", move);
      renderer.domElement.removeEventListener("pointerup", up);
      renderer.domElement.removeEventListener("pointercancel", up);
      renderer.domElement.removeEventListener("wheel", wheel);
      wrapMaterial.map?.dispose();
      for (const geometry of [
        bodyGeometry,
        rimGeometry,
        interiorGeometry,
        baseGeometry,
        handleGeometry,
        wrapGeometry,
      ])
        geometry.dispose();
      for (const material of [ceramic, interiorMaterial, handleMaterial, wrapMaterial])
        material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
  resize();
  try {
    if (options.artworkUrl) await preview.setArtwork(options.artworkUrl);
  } catch (error) {
    preview.dispose();
    options.onUnavailable?.(error instanceof Error ? error : new Error(String(error)));
    return null;
  }
  return preview;
};
