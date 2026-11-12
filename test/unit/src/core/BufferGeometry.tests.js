import { BufferGeometry } from '../../../../src/core/BufferGeometry.js';

import {
	BufferAttribute,
	Float16BufferAttribute,
	Uint16BufferAttribute,
	Uint32BufferAttribute
} from '../../../../src/core/BufferAttribute.js';
import { Vector3 } from '../../../../src/math/Vector3.js';
import { Matrix4 } from '../../../../src/math/Matrix4.js';
import { Matrix3 } from '../../../../src/math/Matrix3.js';
import { Quaternion } from '../../../../src/math/Quaternion.js';
import { Sphere } from '../../../../src/math/Sphere.js';
import { x, y, z } from '../../utils/math-constants.js';
import { EventDispatcher } from '../../../../src/core/EventDispatcher.js';
import { toHalfFloat } from '../../../../src/extras/DataUtils.js';
import { StaticDrawUsage, FloatType } from '../../../../src/constants.js';

const DegToRad = Math.PI / 180;

function bufferAttributeEquals( a, b, tolerance ) {

	tolerance = tolerance || 0.0001;

	if ( a.count !== b.count || a.itemSize !== b.itemSize ) {

		return false;

	}

	for ( let i = 0, il = a.count * a.itemSize; i < il; i ++ ) {

		const delta = Math.abs( a.array[ i ] - b.array[ i ] );
		if ( delta > tolerance ) {

			return false;

		}

	}

	return true;

}

function getBBForVertices( vertices ) {

	const geometry = new BufferGeometry();

	geometry.setAttribute( 'position', new BufferAttribute( new Float32Array( vertices ), 3 ) );
	geometry.computeBoundingBox();

	return geometry.boundingBox;

}

function getBSForVertices( vertices ) {

	const geometry = new BufferGeometry();

	geometry.setAttribute( 'position', new BufferAttribute( new Float32Array( vertices ), 3 ) );
	geometry.computeBoundingSphere();

	return geometry.boundingSphere;

}

function getNormalsForVertices( vertices, assert ) {

	const geometry = new BufferGeometry();

	geometry.setAttribute( 'position', new BufferAttribute( new Float32Array( vertices ), 3 ) );

	geometry.computeVertexNormals();

	assert.ok( geometry.attributes.normal !== undefined, 'normal attribute was created' );

	return geometry.attributes.normal.array;

}

export default QUnit.module( 'Core', () => {

	QUnit.module( 'BufferGeometry', () => {

		// INHERITANCE
		QUnit.test( 'Extending', ( assert ) => {

			const object = new BufferGeometry();
			assert.strictEqual(
				object instanceof EventDispatcher, true,
				'BufferGeometry extends from EventDispatcher'
			);

		} );

		// INSTANCING
		QUnit.test( 'Instancing', ( assert ) => {

			const object = new BufferGeometry();
			assert.ok( object, 'Can instantiate a BufferGeometry.' );

		} );

		// PROPERTIES

		QUnit.test( 'type', ( assert ) => {

			const object = new BufferGeometry();
			assert.ok(
				object.type === 'BufferGeometry',
				'BufferGeometry.type should be BufferGeometry'
			);

		} );

		// PUBLIC
		QUnit.test( 'isBufferGeometry', ( assert ) => {

			const object = new BufferGeometry();
			assert.ok(
				object.isBufferGeometry,
				'BufferGeometry.isBufferGeometry should be true'
			);

		} );

		QUnit.test( 'setIndex/getIndex', ( assert ) => {

			const a = new BufferGeometry();
			const uint16 = [ 1, 2, 3 ];
			const uint32 = [ 65535, 65536, 65537 ];
			const str = 'foo';

			a.setIndex( uint16 );
			assert.ok( a.getIndex() instanceof Uint16BufferAttribute, 'Index has the right type' );
			assert.deepEqual( a.getIndex().array, new Uint16Array( uint16 ), 'Small index gets stored correctly' );

			a.setIndex( uint32 );
			assert.ok( a.getIndex() instanceof Uint32BufferAttribute, 'Index has the right type' );
			assert.deepEqual( a.getIndex().array, new Uint32Array( uint32 ), 'Large index gets stored correctly' );

			a.setIndex( str );
			assert.strictEqual( a.getIndex(), str, 'Weird index gets stored correctly' );

		} );

		QUnit.test( 'set / delete Attribute', ( assert ) => {

			const geometry = new BufferGeometry();
			const attributeName = 'position';

			assert.ok( geometry.attributes[ attributeName ] === undefined, 'no attribute defined' );

			geometry.setAttribute( attributeName, new BufferAttribute( new Float32Array( [ 1, 2, 3 ], 1 ) ) );

			assert.ok( geometry.attributes[ attributeName ] !== undefined, 'attribute is defined' );

			geometry.deleteAttribute( attributeName );

			assert.ok( geometry.attributes[ attributeName ] === undefined, 'no attribute defined' );

		} );

		QUnit.test( 'addGroup', ( assert ) => {

			const a = new BufferGeometry();
			const expected = [
				{
					start: 0,
					count: 1,
					materialIndex: 0
				},
				{
					start: 1,
					count: 2,
					materialIndex: 2
				}
			];

			a.addGroup( 0, 1, 0 );
			a.addGroup( 1, 2, 2 );

			assert.deepEqual( a.groups, expected, 'Check groups were stored correctly and in order' );

			a.clearGroups();
			assert.strictEqual( a.groups.length, 0, 'Check groups were deleted correctly' );

		} );

		QUnit.test( 'setDrawRange', ( assert ) => {

			const a = new BufferGeometry();

			a.setDrawRange( 1.0, 7 );

			assert.deepEqual( a.drawRange, {
				start: 1,
				count: 7
			}, 'Check draw range was stored correctly' );

		} );

		QUnit.test( 'applyMatrix4', ( assert ) => {

			const geometry = new BufferGeometry();
			geometry.setAttribute( 'position', new BufferAttribute( new Float32Array( 6 ), 3 ) );

			const matrix = new Matrix4().set(
				1, 0, 0, 1.5,
				0, 1, 0, - 2,
				0, 0, 1, 3,
				0, 0, 0, 1
			);
			geometry.applyMatrix4( matrix );

			const position = geometry.attributes.position.array;
			const m = matrix.elements;
			assert.ok( position[ 0 ] === m[ 12 ] && position[ 1 ] === m[ 13 ] && position[ 2 ] === m[ 14 ], 'position was extracted from matrix' );
			assert.ok( position[ 3 ] === m[ 12 ] && position[ 4 ] === m[ 13 ] && position[ 5 ] === m[ 14 ], 'position was extracted from matrix twice' );
			assert.ok( geometry.attributes.position.version === 1, 'version was increased during update' );

		} );

		QUnit.test( 'applyMatrix4 - morphAttributes (absolute)', ( assert ) => {

			const geometry = new BufferGeometry();

			geometry.setAttribute( 'position', new BufferAttribute( new Float32Array( [
				0, 0, 0,
				1, 0, 0
			] ), 3 ) );

			geometry.setAttribute( 'normal', new BufferAttribute( new Float32Array( [
				0, 0, 1,
				1, 0, 0
			] ), 3 ) );

			// absolute morph targets store full positions/normals (morphTargetsRelative = false)

			geometry.morphAttributes.position = [ new BufferAttribute( new Float32Array( [
				0, 1, 0,
				1, 1, 0
			] ), 3 ) ];

			geometry.morphAttributes.normal = [ new BufferAttribute( new Float32Array( [
				0, 1, 0,
				0, 0, 1
			] ), 3 ) ];

			const matrix = new Matrix4().makeTranslation( 10, 20, 30 );

			geometry.applyMatrix4( matrix );

			const morphPosition = geometry.morphAttributes.position[ 0 ].array;

			// absolute positions are translated like the base position attribute

			assert.ok(
				morphPosition[ 0 ] === 10 && morphPosition[ 1 ] === 21 && morphPosition[ 2 ] === 30 &&
				morphPosition[ 3 ] === 11 && morphPosition[ 4 ] === 21 && morphPosition[ 5 ] === 30,
				'absolute position morph target was translated'
			);

			assert.ok( geometry.morphAttributes.position[ 0 ].version === 1, 'position morph target was marked for update' );

			const morphNormal = geometry.morphAttributes.normal[ 0 ].array;

			// translations must not affect normals

			assert.ok(
				morphNormal[ 0 ] === 0 && morphNormal[ 1 ] === 1 && morphNormal[ 2 ] === 0 &&
				morphNormal[ 3 ] === 0 && morphNormal[ 4 ] === 0 && morphNormal[ 5 ] === 1,
				'normal morph target is unaffected by translation'
			);

			assert.ok( geometry.morphAttributes.normal[ 0 ].version === 1, 'normal morph target was marked for update' );

		} );

		QUnit.test( 'applyMatrix4 - morphAttributes (relative)', ( assert ) => {

			const geometry = new BufferGeometry();

			geometry.setAttribute( 'position', new BufferAttribute( new Float32Array( [
				0, 0, 0,
				1, 0, 0
			] ), 3 ) );

			geometry.setAttribute( 'normal', new BufferAttribute( new Float32Array( [
				0, 0, 1,
				1, 0, 0
			] ), 3 ) );

			// relative morph targets store offsets/deltas (morphTargetsRelative = true)

			geometry.morphTargetsRelative = true;

			geometry.morphAttributes.position = [ new BufferAttribute( new Float32Array( [
				0, 1, 0,
				0, 1, 0
			] ), 3 ) ];

			const matrix = new Matrix4().makeTranslation( 10, 20, 30 );

			geometry.applyMatrix4( matrix );

			const morphPosition = geometry.morphAttributes.position[ 0 ].array;

			// relative offsets must not pick up the translation component

			assert.ok(
				morphPosition[ 0 ] === 0 && morphPosition[ 1 ] === 1 && morphPosition[ 2 ] === 0 &&
				morphPosition[ 3 ] === 0 && morphPosition[ 4 ] === 1 && morphPosition[ 5 ] === 0,
				'relative position morph target keeps its offset under translation'
			);

			// a non-uniform scale must still scale the linear part of the offset

			geometry.applyMatrix4( new Matrix4().makeScale( 2, 3, 4 ) );

			const scaledMorphPosition = geometry.morphAttributes.position[ 0 ].array;

			assert.ok(
				scaledMorphPosition[ 0 ] === 0 && scaledMorphPosition[ 1 ] === 3 && scaledMorphPosition[ 2 ] === 0 &&
				scaledMorphPosition[ 3 ] === 0 && scaledMorphPosition[ 4 ] === 3 && scaledMorphPosition[ 5 ] === 0,
				'relative position morph target is scaled by the linear part of the matrix'
			);

			// normal morph targets are direction vectors and therefore follow the normal
			// matrix of the transformation (inverse transpose), just like the base normal
			// attribute. Use a separate geometry so translation/scale steps do not accumulate

			const normalGeometry = new BufferGeometry();

			normalGeometry.setAttribute( 'position', new BufferAttribute( new Float32Array( [
				0, 0, 0,
				1, 0, 0
			] ), 3 ) );

			normalGeometry.morphTargetsRelative = true;

			normalGeometry.morphAttributes.normal = [ new BufferAttribute( new Float32Array( [
				1, 0, 0,
				0, 1, 0
			] ), 3 ) ];

			normalGeometry.applyMatrix4( new Matrix4().makeTranslation( 10, 20, 30 ) );

			let morphNormal = normalGeometry.morphAttributes.normal[ 0 ].array;

			assert.ok(
				morphNormal[ 0 ] === 1 && morphNormal[ 1 ] === 0 && morphNormal[ 2 ] === 0 &&
				morphNormal[ 3 ] === 0 && morphNormal[ 4 ] === 1 && morphNormal[ 5 ] === 0,
				'relative normal morph target is unaffected by translation'
			);

			// scale (2, 1, 1): the normal matrix is diag(0.5, 1, 1), +X normalizes back to
			// +X while +Y stays +Y; compare against the same computation used for base normals

			normalGeometry.applyMatrix4( new Matrix4().makeScale( 2, 1, 1 ) );

			const expectedX = new Vector3( 1, 0, 0 ).applyNormalMatrix(
				new Matrix3().getNormalMatrix( new Matrix4().makeScale( 2, 1, 1 ) )
			);
			const expectedY = new Vector3( 0, 1, 0 ).applyNormalMatrix(
				new Matrix3().getNormalMatrix( new Matrix4().makeScale( 2, 1, 1 ) )
			);

			morphNormal = normalGeometry.morphAttributes.normal[ 0 ].array;

			assert.ok(
				Math.abs( morphNormal[ 0 ] - expectedX.x ) < Number.EPSILON &&
				Math.abs( morphNormal[ 1 ] - expectedX.y ) < Number.EPSILON &&
				Math.abs( morphNormal[ 2 ] - expectedX.z ) < Number.EPSILON &&
				Math.abs( morphNormal[ 3 ] - expectedY.x ) < Number.EPSILON &&
				Math.abs( morphNormal[ 4 ] - expectedY.y ) < Number.EPSILON &&
				Math.abs( morphNormal[ 5 ] - expectedY.z ) < Number.EPSILON,
				'relative normal morph target is transformed by the normal matrix'
			);

			// a rotated geometry keeps its transformed normals in sync with the base normals

			const rotatedGeometry = new BufferGeometry();

			rotatedGeometry.setAttribute( 'normal', new BufferAttribute( new Float32Array( [
				1, 0, 0,
				0, 1, 0
			] ), 3 ) );

			rotatedGeometry.morphTargetsRelative = true;

			rotatedGeometry.morphAttributes.normal = [ new BufferAttribute( new Float32Array( [
				1, 0, 0,
				0, 1, 0
			] ), 3 ) ];

			rotatedGeometry.applyMatrix4( new Matrix4().makeRotationZ( Math.PI / 2 ) );

			const baseNormal = rotatedGeometry.attributes.normal.array;
			const rotatedMorphNormal = rotatedGeometry.morphAttributes.normal[ 0 ].array;

			assert.ok(
				bufferAttributeEquals(
					rotatedGeometry.morphAttributes.normal[ 0 ],
					new BufferAttribute( new Float32Array( baseNormal ), 3 )
				),
				'rotated normal morph target matches the rotated base normal attribute'
			);

			assert.ok(
				Math.abs( rotatedMorphNormal[ 0 ] - 0 ) < Number.EPSILON &&
				Math.abs( rotatedMorphNormal[ 1 ] - 1 ) < Number.EPSILON,
				'rotated normal morph target points into the rotated direction'
			);

		} );

		QUnit.test( 'applyQuaternion', ( assert ) => {

			const geometry = new BufferGeometry();
			geometry.setAttribute( 'position', new BufferAttribute( new Float32Array( [ 1, 2, 3, 4, 5, 6 ] ), 3 ) );

			const q = new Quaternion( 0.5, 0.5, 0.5, 0.5 );
			geometry.applyQuaternion( q );

			const pos = geometry.attributes.position.array;

			// geometry was rotated around the (1, 1, 1) axis.
			assert.ok( pos[ 0 ] === 3 && pos[ 1 ] === 1 && pos[ 2 ] === 2 &&
				pos[ 3 ] === 6 && pos[ 4 ] === 4 && pos[ 5 ] === 5, 'vertices were rotated properly' );

		} );

		QUnit.test( 'rotateX/Y/Z', ( assert ) => {

			const geometry = new BufferGeometry();
			geometry.setAttribute( 'position', new BufferAttribute( new Float32Array( [ 1, 2, 3, 4, 5, 6 ] ), 3 ) );

			const pos = geometry.attributes.position.array;

			geometry.rotateX( 180 * DegToRad );

			// object was rotated around x so all items should be flipped but the x ones
			assert.ok( pos[ 0 ] === 1 && pos[ 1 ] === - 2 && pos[ 2 ] === - 3 &&
				pos[ 3 ] === 4 && pos[ 4 ] === - 5 && pos[ 5 ] === - 6, 'vertices were rotated around x by 180 degrees' );

			geometry.rotateY( 180 * DegToRad );

			// vertices were rotated around y so all items should be flipped again but the y ones
			assert.ok( pos[ 0 ] === - 1 && pos[ 1 ] === - 2 && pos[ 2 ] === 3 &&
				pos[ 3 ] === - 4 && pos[ 4 ] === - 5 && pos[ 5 ] === 6, 'vertices were rotated around y by 180 degrees' );

			geometry.rotateZ( 180 * DegToRad );

			// vertices were rotated around z so all items should be flipped again but the z ones
			assert.ok( pos[ 0 ] === 1 && pos[ 1 ] === 2 && pos[ 2 ] === 3 &&
				pos[ 3 ] === 4 && pos[ 4 ] === 5 && pos[ 5 ] === 6, 'vertices were rotated around z by 180 degrees' );

		} );

		QUnit.test( 'translate', ( assert ) => {

			const geometry = new BufferGeometry();
			geometry.setAttribute( 'position', new BufferAttribute( new Float32Array( [ 1, 2, 3, 4, 5, 6 ] ), 3 ) );

			const pos = geometry.attributes.position.array;

			geometry.translate( 10, 20, 30 );

			assert.ok( pos[ 0 ] === 11 && pos[ 1 ] === 22 && pos[ 2 ] === 33 &&
				pos[ 3 ] === 14 && pos[ 4 ] === 25 && pos[ 5 ] === 36, 'vertices were translated' );

		} );

		QUnit.test( 'scale', ( assert ) => {

			const geometry = new BufferGeometry();
			geometry.setAttribute( 'position', new BufferAttribute( new Float32Array( [ - 1, - 1, - 1, 2, 2, 2 ] ), 3 ) );

			const pos = geometry.attributes.position.array;

			geometry.scale( 1, 2, 3 );

			assert.ok( pos[ 0 ] === - 1 && pos[ 1 ] === - 2 && pos[ 2 ] === - 3 &&
				pos[ 3 ] === 2 && pos[ 4 ] === 4 && pos[ 5 ] === 6, 'vertices were scaled' );

		} );

		QUnit.test( 'lookAt', ( assert ) => {

			const a = new BufferGeometry();
			const vertices = new Float32Array( [
				- 1.0, - 1.0, 1.0,
				1.0, - 1.0, 1.0,
				1.0, 1.0, 1.0,

				1.0, 1.0, 1.0,
				- 1.0, 1.0, 1.0,
				- 1.0, - 1.0, 1.0
			] );
			a.setAttribute( 'position', new BufferAttribute( vertices, 3 ) );

			const sqrt = Math.sqrt( 2 );
			const expected = new BufferAttribute( new Float32Array( [
				1, 0, - sqrt,
				- 1, 0, - sqrt,
				- 1, sqrt, 0,

				- 1, sqrt, 0,
				1, sqrt, 0,
				1, 0, - sqrt
			] ), 3 );

			a.lookAt( new Vector3( 0, 1, - 1 ) );

			assert.ok( bufferAttributeEquals( a.attributes.position, expected ), 'Rotation is correct' );

		} );

		QUnit.test( 'center', ( assert ) => {

			const geometry = new BufferGeometry();
			geometry.setAttribute( 'position', new BufferAttribute( new Float32Array( [
				- 1, - 1, - 1,
				1, 1, 1,
				4, 4, 4
			] ), 3 ) );

			geometry.center();

			const pos = geometry.attributes.position.array;

			// the boundingBox should go from (-1, -1, -1) to (4, 4, 4) so it has a size of (5, 5, 5)
			// after centering it the vertices should be placed between (-2.5, -2.5, -2.5) and (2.5, 2.5, 2.5)
			assert.ok( pos[ 0 ] === - 2.5 && pos[ 1 ] === - 2.5 && pos[ 2 ] === - 2.5 &&
				pos[ 3 ] === - 0.5 && pos[ 4 ] === - 0.5 && pos[ 5 ] === - 0.5 &&
				pos[ 6 ] === 2.5 && pos[ 7 ] === 2.5 && pos[ 8 ] === 2.5, 'vertices were replaced by boundingBox dimensions' );

		} );

		QUnit.test( 'computeBoundingBox', ( assert ) => {

			let bb = getBBForVertices( [ - 1, - 2, - 3, 13, - 2, - 3.5, - 1, - 20, 0, - 4, 5, 6 ] );

			assert.ok( bb.min.x === - 4 && bb.min.y === - 20 && bb.min.z === - 3.5, 'min values are set correctly' );
			assert.ok( bb.max.x === 13 && bb.max.y === 5 && bb.max.z === 6, 'max values are set correctly' );

			bb = getBBForVertices( [ - 1, - 1, - 1 ] );

			assert.ok( bb.min.x === bb.max.x && bb.min.y === bb.max.y && bb.min.z === bb.max.z, 'since there is only one vertex, max and min are equal' );
			assert.ok( bb.min.x === - 1 && bb.min.y === - 1 && bb.min.z === - 1, 'since there is only one vertex, min and max are this vertex' );

		} );

		QUnit.test( 'computeBoundingSphere', ( assert ) => {

			let bs = getBSForVertices( [ - 10, 0, 0, 10, 0, 0 ] );

			assert.ok( bs.radius === 10, 'radius is equal to deltaMinMax / 2' );
			assert.ok( bs.center.x === 0 && bs.center.y === 0 && bs.center.y === 0, 'bounding sphere is at ( 0, 0, 0 )' );

			bs = getBSForVertices( [ - 5, 11, - 3, 5, - 11, 3 ] );
			const radius = new Vector3( 5, 11, 3 ).length();

			assert.ok( bs.radius === radius, 'radius is equal to directionLength' );
			assert.ok( bs.center.x === 0 && bs.center.y === 0 && bs.center.y === 0, 'bounding sphere is at ( 0, 0, 0 )' );

		} );

		const toHalfFloatArray = ( f32Array ) => {

			const f16Array = new Uint16Array( f32Array.length );
			for ( let i = 0, n = f32Array.length; i < n; ++ i ) {

				f16Array[ i ] = toHalfFloat( f32Array[ i ] );

			}

			return f16Array;

		};

		QUnit.test( 'computeBoundingBox - Float16', ( assert ) => {

			const vertices = [ - 1, - 2, - 3, 13, - 2, - 3.5, - 1, - 20, 0, - 4, 5, 6 ];
			const geometry = new BufferGeometry();

			geometry.setAttribute( 'position', new Float16BufferAttribute( toHalfFloatArray( vertices ), 3 ) );
			geometry.computeBoundingBox();

			let bb = geometry.boundingBox;

			assert.ok( bb.min.x === - 4 && bb.min.y === - 20 && bb.min.z === - 3.5, 'min values are set correctly' );
			assert.ok( bb.max.x === 13 && bb.max.y === 5 && bb.max.z === 6, 'max values are set correctly' );

			bb = getBBForVertices( [ - 1, - 1, - 1 ] );

			assert.ok( bb.min.x === bb.max.x && bb.min.y === bb.max.y && bb.min.z === bb.max.z, 'since there is only one vertex, max and min are equal' );
			assert.ok( bb.min.x === - 1 && bb.min.y === - 1 && bb.min.z === - 1, 'since there is only one vertex, min and max are this vertex' );

		} );

		QUnit.test( 'computeBoundingSphere - Float16', ( assert ) => {

			const vertices = [ - 10, 0, 0, 10, 0, 0 ];
			const geometry = new BufferGeometry();

			geometry.setAttribute( 'position', new Float16BufferAttribute( toHalfFloatArray( vertices ), 3 ) );
			geometry.computeBoundingSphere();

			let bs = geometry.boundingSphere;

			assert.ok( bs.radius === 10, 'radius is equal to deltaMinMax / 2' );
			assert.ok( bs.center.x === 0 && bs.center.y === 0 && bs.center.y === 0, 'bounding sphere is at ( 0, 0, 0 )' );

			bs = getBSForVertices( [ - 5, 11, - 3, 5, - 11, 3 ] );
			const radius = new Vector3( 5, 11, 3 ).length();

			assert.ok( bs.radius === radius, 'radius is equal to directionLength' );
			assert.ok( bs.center.x === 0 && bs.center.y === 0 && bs.center.y === 0, 'bounding sphere is at ( 0, 0, 0 )' );

		} );

		QUnit.test( 'computeVertexNormals', ( assert ) => {

			// get normals for a counter clockwise created triangle
			let normals = getNormalsForVertices( [ - 1, 0, 0, 1, 0, 0, 0, 1, 0 ], assert );

			assert.ok( normals[ 0 ] === 0 && normals[ 1 ] === 0 && normals[ 2 ] === 1,
				'first normal is pointing to screen since the triangle was created counter clockwise' );

			assert.ok( normals[ 3 ] === 0 && normals[ 4 ] === 0 && normals[ 5 ] === 1,
				'second normal is pointing to screen since the triangle was created counter clockwise' );

			assert.ok( normals[ 6 ] === 0 && normals[ 7 ] === 0 && normals[ 8 ] === 1,
				'third normal is pointing to screen since the triangle was created counter clockwise' );

			// get normals for a clockwise created triangle
			normals = getNormalsForVertices( [ 1, 0, 0, - 1, 0, 0, 0, 1, 0 ], assert );

			assert.ok( normals[ 0 ] === 0 && normals[ 1 ] === 0 && normals[ 2 ] === - 1,
				'first normal is pointing to screen since the triangle was created clockwise' );

			assert.ok( normals[ 3 ] === 0 && normals[ 4 ] === 0 && normals[ 5 ] === - 1,
				'second normal is pointing to screen since the triangle was created clockwise' );

			assert.ok( normals[ 6 ] === 0 && normals[ 7 ] === 0 && normals[ 8 ] === - 1,
				'third normal is pointing to screen since the triangle was created clockwise' );

			normals = getNormalsForVertices( [ 0, 0, 1, 0, 0, - 1, 1, 1, 0 ], assert );

			// the triangle is rotated by 45 degrees to the right so the normals of the three vertices
			// should point to (1, -1, 0).normalized(). The simplest solution is to check against a normalized
			// vector (1, -1, 0) but you will get calculation errors because of floating calculations so another
			// valid technique is to create a vector which stands in 90 degrees to the normals and calculate the
			// dot product which is the cos of the angle between them. This should be < floating calculation error
			// which can be taken from Number.EPSILON
			const direction = new Vector3( 1, 1, 0 ).normalize(); // a vector which should have 90 degrees difference to normals
			const difference = direction.dot( new Vector3( normals[ 0 ], normals[ 1 ], normals[ 2 ] ) );
			assert.ok( difference < Number.EPSILON, 'normal is equal to reference vector' );

			// get normals for a line should be NAN because you need min a triangle to calculate normals
			normals = getNormalsForVertices( [ 1, 0, 0, - 1, 0, 0 ], assert );
			for ( let i = 0; i < normals.length; i ++ ) {

				assert.ok( ! normals[ i ], 'normals can\'t be calculated which is good' );

			}

		} );

		QUnit.test( 'computeVertexNormals (indexed)', ( assert ) => {

			const sqrt = 0.5 * Math.sqrt( 2 );
			const normal = new BufferAttribute( new Float32Array( [
				- 1, 0, 0, - 1, 0, 0, - 1, 0, 0,
				sqrt, sqrt, 0, sqrt, sqrt, 0, sqrt, sqrt, 0
			] ), 3 );
			const position = new BufferAttribute( new Float32Array( [
				0.5, 0.5, 0.5, 0.5, 0.5, - 0.5, 0.5, - 0.5, 0.5,
				0.5, - 0.5, - 0.5, - 0.5, 0.5, - 0.5, - 0.5, 0.5, 0.5
			] ), 3 );
			// the index buffer defines the same two triangles but in counter-clockwise order,
			// which should result in flipped normals.
			const flippedNormals = normal.clone().applyMatrix4( new Matrix4().makeScale( - 1, - 1, - 1 ) );
			const index = new BufferAttribute( new Uint16Array( [
				0, 2, 1, 3, 5, 4
			] ), 1 );

			let a = new BufferGeometry();
			a.setAttribute( 'position', position );
			a.computeVertexNormals();
			assert.ok(
				bufferAttributeEquals( normal, a.getAttribute( 'normal' ) ),
				'Regular geometry: first computed normals are correct'
			);

			// a second time to see if the existing normals get properly deleted
			a.computeVertexNormals();
			assert.ok(
				bufferAttributeEquals( normal, a.getAttribute( 'normal' ) ),
				'Regular geometry: second computed normals are correct'
			);

			// indexed geometry
			a = new BufferGeometry();
			a.setAttribute( 'position', position );
			a.setIndex( index );
			a.computeVertexNormals();
			assert.ok( bufferAttributeEquals( flippedNormals, a.getAttribute( 'normal' ) ), 'Indexed geometry: computed normals are correct' );

		} );

		QUnit.test( 'toNonIndexed', ( assert ) => {

			const geometry = new BufferGeometry();
			const vertices = new Float32Array( [
				0.5, 0.5, 0.5, 0.5, 0.5, - 0.5, 0.5, - 0.5, 0.5, 0.5, - 0.5, - 0.5
			] );
			const index = new BufferAttribute( new Uint16Array( [ 0, 2, 1, 2, 3, 1 ] ) );
			const expected = new Float32Array( [
				0.5, 0.5, 0.5, 0.5, - 0.5, 0.5, 0.5, 0.5, - 0.5,
				0.5, - 0.5, 0.5, 0.5, - 0.5, - 0.5, 0.5, 0.5, - 0.5
			] );

			geometry.setAttribute( 'position', new BufferAttribute( vertices, 3 ) );
			geometry.setIndex( index );

			const nonIndexed = geometry.toNonIndexed();

			assert.deepEqual( nonIndexed.getAttribute( 'position' ).array, expected, 'Expected vertices' );

		} );

		QUnit.test( 'toJSON', ( assert ) => {

			const index = new BufferAttribute( new Uint16Array( [ 0, 1, 2, 3 ] ), 1 );
			const attribute1 = new BufferAttribute( new Uint16Array( [ 1, 3, 5, 7 ] ), 1 );
			attribute1.name = 'attribute1';
			const a = new BufferGeometry();
			a.name = 'JSONQUnit.test';
			// a.parameters = { "placeholder": 0 };
			a.setAttribute( 'attribute1', attribute1 );
			a.setIndex( index );
			a.addGroup( 0, 1, 2 );
			a.boundingSphere = new Sphere( new Vector3( x, y, z ), 0.5 );
			let j = a.toJSON();
			const gold = {
				'metadata': {
					'version': 4.7,
					'type': 'BufferGeometry',
					'generator': 'BufferGeometry.toJSON'
				},
				'uuid': a.uuid,
				'type': 'BufferGeometry',
				'name': 'JSONQUnit.test',
				'data': {
					'attributes': {
						'attribute1': {
							'itemSize': 1,
							'type': 'Uint16Array',
							'array': [ 1, 3, 5, 7 ],
							'normalized': false,
							'name': 'attribute1',
							'usage': StaticDrawUsage,
							'gpuType': FloatType
						}
					},
					'index': {
						'type': 'Uint16Array',
						'array': [ 0, 1, 2, 3 ]
					},
					'groups': [
						{
							'start': 0,
							'count': 1,
							'materialIndex': 2
						}
					],
					'boundingSphere': {
						'center': [ 2, 3, 4 ],
						'radius': 0.5
					}
				}
			};

			assert.deepEqual( j, gold, 'Generated JSON is as expected' );

			// add morphAttributes
			a.morphAttributes.attribute1 = [];
			a.morphAttributes.attribute1.push( attribute1.clone() );
			j = a.toJSON();
			gold.data.morphAttributes = {
				'attribute1': [ {
					'itemSize': 1,
					'type': 'Uint16Array',
					'array': [ 1, 3, 5, 7 ],
					'normalized': false,
					'name': 'attribute1',
					'usage': StaticDrawUsage,
					'gpuType': FloatType
				} ]
			};
			gold.data.morphTargetsRelative = false;

			assert.deepEqual( j, gold, 'Generated JSON with morphAttributes is as expected' );

		} );

		QUnit.test( 'clone', ( assert ) => {

			const a = new BufferGeometry();
			a.setAttribute( 'attribute1', new BufferAttribute( new Float32Array( [ 1, 2, 3, 4, 5, 6 ] ), 3 ) );
			a.setAttribute( 'attribute2', new BufferAttribute( new Float32Array( [ 0, 1, 3, 5, 6 ] ), 1 ) );
			a.addGroup( 0, 1, 2 );
			a.computeBoundingBox();
			a.computeBoundingSphere();
			a.setDrawRange( 0, 1 );
			const b = a.clone();

			assert.notEqual( a, b, 'A new object was created' );
			assert.notEqual( a.id, b.id, 'New object has a different GUID' );

			assert.strictEqual(
				Object.keys( a.attributes ).count, Object.keys( b.attributes ).count,
				'Both objects have the same amount of attributes'
			);
			assert.ok(
				bufferAttributeEquals( a.getAttribute( 'attribute1' ), b.getAttribute( 'attribute1' ) ),
				'First attributes buffer is identical'
			);
			assert.ok(
				bufferAttributeEquals( a.getAttribute( 'attribute2' ), b.getAttribute( 'attribute2' ) ),
				'Second attributes buffer is identical'
			);

			assert.deepEqual( a.groups, b.groups, 'Groups are identical' );

			assert.ok( a.boundingBox.equals( b.boundingBox ), 'BoundingBoxes are equal' );
			assert.ok( a.boundingSphere.equals( b.boundingSphere ), 'BoundingSpheres are equal' );

			assert.strictEqual( a.drawRange.start, b.drawRange.start, 'DrawRange start is identical' );
			assert.strictEqual( a.drawRange.count, b.drawRange.count, 'DrawRange count is identical' );

		} );

		QUnit.test( 'copy', ( assert ) => {

			const geometry = new BufferGeometry();
			geometry.setAttribute( 'attrName', new BufferAttribute( new Float32Array( [ 1, 2, 3, 4, 5, 6 ] ), 3 ) );
			geometry.setAttribute( 'attrName2', new BufferAttribute( new Float32Array( [ 0, 1, 3, 5, 6 ] ), 1 ) );

			const copy = new BufferGeometry().copy( geometry );

			assert.ok( copy !== geometry && geometry.id !== copy.id, 'new object was created' );

			Object.keys( geometry.attributes ).forEach( function ( key ) {

				const attribute = geometry.attributes[ key ];
				assert.ok( attribute !== undefined, 'all attributes where copied' );

				for ( let i = 0; i < attribute.array.length; i ++ ) {

					assert.ok( attribute.array[ i ] === copy.attributes[ key ].array[ i ], 'values of the attribute are equal' );

				}

			} );

		} );

		QUnit.test( 'dispose', ( assert ) => {

			assert.expect( 0 );

			const object = new BufferGeometry();
			object.dispose();

		} );

	} );

} );
