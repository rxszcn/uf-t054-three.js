import { BufferGeometry, BufferAttribute, Matrix4, Mesh, MeshBasicMaterial } from 'three';
import { GLTFExporter } from '../../../../examples/jsm/exporters/GLTFExporter.js';

function dataURIToArrayBuffer( uri ) {

	const base64 = uri.split( ',' )[ 1 ];
	const binary = atob( base64 );
	const bytes = new Uint8Array( binary.length );

	for ( let i = 0; i < binary.length; i ++ ) {

		bytes[ i ] = binary.charCodeAt( i );

	}

	return bytes.buffer;

}

export default QUnit.module( 'Addons', () => {

	QUnit.module( 'Exporters', () => {

		QUnit.module( 'GLTFExporter morph targets', () => {

			QUnit.test( 'morph deltas stay consistent after geometry transform', ( assert ) => {

				const done = assert.async();

				// absolute morph targets (morphTargetsRelative = false): the exporter
				// converts them to glTF relative deltas via (morph - base)

				const geometry = new BufferGeometry();
				geometry.setAttribute( 'position', new BufferAttribute( new Float32Array( [ 0, 0, 0, 1, 0, 0 ] ), 3 ) );
				geometry.setAttribute( 'normal', new BufferAttribute( new Float32Array( [ 0, 0, 1, 0, 0, 1 ] ), 3 ) );
				geometry.morphAttributes.position = [ new BufferAttribute( new Float32Array( [ 0, 1, 0, 1, 1, 0 ] ), 3 ) ];
				geometry.morphAttributes.normal = [ new BufferAttribute( new Float32Array( [ 0, 1, 0, 0, 1, 0 ] ), 3 ) ];

				geometry.applyMatrix4( new Matrix4().makeTranslation( 10, 20, 30 ) );

				const mesh = new Mesh( geometry, new MeshBasicMaterial() );
				mesh.morphTargetInfluences = [ 0.5 ];
				mesh.morphTargetDictionary = { smile: 0 };

				new GLTFExporter().parse( mesh, ( gltf ) => {

					try {

						const targetAccessorIndex = gltf.meshes[ 0 ].primitives[ 0 ].targets[ 0 ].POSITION;
						const accessor = gltf.accessors[ targetAccessorIndex ];
						const bufferView = gltf.bufferViews[ accessor.bufferView ];
						const arrayBuffer = dataURIToArrayBuffer( gltf.buffers[ bufferView.buffer ].uri );

						const view = new DataView( arrayBuffer, bufferView.byteOffset, bufferView.byteLength );
						const offset = accessor.byteOffset || 0;

						// first vertex delta: (0,1,0) - (0,0,0) = (0,1,0);
						// the translation must cancel out of the exported delta

						assert.ok(
							view.getFloat32( offset, true ) === 0 &&
							view.getFloat32( offset + 4, true ) === 1 &&
							view.getFloat32( offset + 8, true ) === 0,
							'exported relative position delta is unchanged by the translation'
						);

						const normalAccessorIndex = gltf.meshes[ 0 ].primitives[ 0 ].targets[ 0 ].NORMAL;
						const normalAccessor = gltf.accessors[ normalAccessorIndex ];
						const normalBufferView = gltf.bufferViews[ normalAccessor.bufferView ];
						const normalView = new DataView( arrayBuffer, normalBufferView.byteOffset, normalBufferView.byteLength );
						const normalOffset = normalAccessor.byteOffset || 0;

						// normal morph delta: (0,1,0) - (0,0,1) = (0,1,-1); translation leaves normals untouched

						assert.ok(
							normalView.getFloat32( normalOffset, true ) === 0 &&
							normalView.getFloat32( normalOffset + 4, true ) === 1 &&
							normalView.getFloat32( normalOffset + 8, true ) === - 1,
							'exported relative normal delta is unchanged by the translation'
						);

						done();

					} catch ( error ) {

						assert.ok( false, 'failed to read exported morph target data: ' + error );
						done();

					}

				}, ( error ) => {

					assert.ok( false, 'GLTFExporter failed: ' + error );
					done();

				}, { binary: false } );

			} );

		} );

	} );

} );
