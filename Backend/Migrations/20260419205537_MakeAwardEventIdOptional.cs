using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Backend.Migrations
{
    /// <inheritdoc />
    public partial class MakeAwardEventIdOptional : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Awards_Events_EventId",
                table: "Awards");

            migrationBuilder.AlterColumn<int>(
                name: "EventId",
                table: "Awards",
                type: "int",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AddColumn<int>(
                name: "UserId",
                table: "Awards",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Awards_UserId",
                table: "Awards",
                column: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_Awards_Events_EventId",
                table: "Awards",
                column: "EventId",
                principalTable: "Events",
                principalColumn: "EventId",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_Awards_Users_UserId",
                table: "Awards",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "UserId",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Awards_Events_EventId",
                table: "Awards");

            migrationBuilder.DropForeignKey(
                name: "FK_Awards_Users_UserId",
                table: "Awards");

            migrationBuilder.DropIndex(
                name: "IX_Awards_UserId",
                table: "Awards");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "Awards");

            migrationBuilder.AlterColumn<int>(
                name: "EventId",
                table: "Awards",
                type: "int",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Awards_Events_EventId",
                table: "Awards",
                column: "EventId",
                principalTable: "Events",
                principalColumn: "EventId",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
